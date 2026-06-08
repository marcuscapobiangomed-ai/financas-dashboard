import { Category } from '../types/category'
import { supabase } from './supabase'

export interface ParsedTransaction {
  date: string
  type: 'income' | 'expense'
  section: string
  description: string
  amount: number
  category: Category
  confidence?: number
}

export interface ParsingQuestion {
  id: string
  transactionIndex: number
  transactionRaw: string
  question: string
  property: 'category' | 'section' | 'type'
  options: string[]
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface RateLimitData {
  limitTokens?: string | null
  remainingTokens?: string | null
  resetTokens?: string | null
}

export interface GeminiParsingResult {
  transactions: ParsedTransaction[]
  questions: ParsingQuestion[]
  usage?: TokenUsage
  rateLimits?: RateLimitData
}

export async function parseDocumentWithAI(
  apiKey: string,
  fileText: string,
  fileName: string,
  activeSections: Array<{ id: string; label: string }>
): Promise<GeminiParsingResult> {
  // Se não há uma chave configurada localmente, chama a API Serverless da Vercel (segura e com a chave padronizada oculta no servidor)
  if (!apiKey) {
    const categoriesList = Object.keys(Category).join(', ')
    const response = await fetch('/api/parse-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileText,
        fileName,
        activeSections,
        categories: categoriesList
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na Vercel API Route:', errorText)
      
      let parsedError: any = {}
      try {
        parsedError = JSON.parse(errorText)
      } catch (e) {}

      const errorObj = new Error(parsedError.error || `Erro ao invocar a IA no servidor: ${response.status}`) as any
      errorObj.status = response.status
      errorObj.rateLimits = parsedError.rateLimits
      throw errorObj
    }

    const data = await response.json()
    return {
      transactions: data.transactions || [],
      questions: data.questions || [],
      usage: data.usage,
      rateLimits: data.rateLimits
    }
  }

  if (apiKey.startsWith('gsk_')) {
    return parseDocumentWithGroq(apiKey, fileText, fileName, activeSections)
  }
  return parseDocumentWithGemini(apiKey, fileText, fileName, activeSections)
}

async function parseDocumentWithGroq(
  apiKey: string,
  fileText: string,
  fileName: string,
  activeSections: Array<{ id: string; label: string }>
): Promise<GeminiParsingResult> {
  const categoriesList = Object.keys(Category).join(', ')

  const systemInstruction = `Você é um assistente financeiro de inteligência artificial altamente preciso.
Sua tarefa é analisar o texto de extratos bancários, faturas de cartão de crédito em PDF ou planilhas de gastos e extrair TODAS as transações financeiras encontradas de forma estruturada.

Você deve retornar a resposta EXCLUSIVamente como um objeto JSON válido contendo dois arrays: "transactions" e "questions".
Estrutura do JSON:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "type": "income" | "expense",
      "section": "id_da_secao",
      "description": "Descrição limpa (ex: substituir 'IFOOD *IFOOD RESTAURANTE' por 'iFood')",
      "amount": 12.34,
      "category": "NOME_DA_CATEGORIA",
      "confidence": 95
    }
  ],
  "questions": [
    {
      "id": "id_da_duvida",
      "transactionIndex": 0,
      "transactionRaw": "texto bruto da transação no extrato",
      "question": "Pergunta amigável em português para o usuário esclarecer",
      "property": "category" | "section" | "type",
      "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"]
    }
  ]
}

Regras para transações:
1. Extraia a data no formato YYYY-MM-DD. Se o documento não citar o ano, assuma o ano corrente (2026).
2. Classifique o tipo como "income" (para entradas/créditos) ou "expense" (para despesas, compras, débitos, tarifas).
3. Limpe a descrição: remova códigos de transações, números de terminais ou textos redundantes.
4. Extraia o valor como um número real estritamente positivo (sempre positivo).
5. Atribua uma categoria obrigatória. Escolha estritamente a categoria mais adequada destas opções: [${categoriesList}].
6. Atribua uma seção obrigatória ("section"). Escolha estritamente uma destas opções: [${activeSections.map(s => s.id).join(', ')}]. Dica: compras de cartão de crédito devem ser mapeadas para o ID do cartão correspondente, despesas fixas para "despesas_fixas", dinheiro físico ou gastos gerais para "gastos_diarios", etc.
7. Defina o campo "confidence" de 0 a 100 (inteiro), representando a certeza estimada da IA sobre a classificação da categoria e seção.

Regras para dúvidas (questions):
Se você tiver qualquer dúvida ou ambiguidade sobre uma transação específica (ex: estabelecimento desconhecido, PIX sem descrição, valor/categoria ambíguo), inclua-a no array "questions".
- "transactionIndex" é o índice (0-based) da transação correspondente no array "transactions".
- Escreva a pergunta em português brasileiro simples e direto.
- Forneça opções relevantes adequadas (nomes de categorias ou seções permitidas).
- Mesmo se tiver dúvida, preencha sua melhor suposição na transação correspondente do array "transactions".`

  const prompt = `Analise o documento a seguir e extraia as transações financeiras.
Nome do Arquivo: ${fileName}
Conteúdo do Documento:
${fileText}
`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API do Groq: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const responseData = await response.json()
  const contentText = responseData.choices?.[0]?.message?.content

  if (!contentText) {
    throw new Error('O Groq retornou uma resposta sem conteúdo.')
  }

  const usage = responseData.usage ? {
    promptTokens: responseData.usage.prompt_tokens,
    completionTokens: responseData.usage.completion_tokens,
    totalTokens: responseData.usage.total_tokens
  } : undefined

  const limitTokens = response.headers.get('x-ratelimit-limit-tokens')
  const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens')
  const resetTokens = response.headers.get('x-ratelimit-reset-tokens')

  try {
    const parsedResult = JSON.parse(contentText)
    return {
      transactions: parsedResult.transactions || [],
      questions: parsedResult.questions || [],
      usage,
      rateLimits: {
        limitTokens,
        remainingTokens,
        resetTokens
      }
    }
  } catch (err) {
    console.error('Falha ao interpretar JSON retornado pelo Groq:', contentText)
    throw new Error('O formato retornado pelo Groq não é um JSON válido.')
  }
}

async function parseDocumentWithGemini(
  apiKey: string,
  fileText: string,
  fileName: string,
  activeSections: Array<{ id: string; label: string }>
): Promise<GeminiParsingResult> {
  const categoriesList = Object.keys(Category).join(', ')
  const sectionsList = activeSections.map(s => `${s.id} (${s.label})`).join(', ')

  const systemInstruction = `Você é um assistente financeiro de inteligência artificial altamente preciso.
Sua tarefa é analisar o texto de extratos bancários, faturas de cartão de crédito em PDF ou planilhas de gastos e extrair TODAS as transações financeiras encontradas de forma estruturada.

Para cada transação extraída:
1. Extraia a data no formato YYYY-MM-DD. Se o documento não citar o ano, assuma o ano corrente (2026).
2. Classifique o tipo como "income" (para entradas, créditos ou rendimentos) ou "expense" (para despesas, compras, débitos, tarifas ou juros).
3. Limpe a descrição: remova códigos de transações, números de terminais ou textos redundantes (ex: substitua "IFOOD *IFOOD RESTAURANTE SAO PAULO BR" por "iFood").
4. Extraia o valor como um número real estritamente positivo (sempre positivo).
5. Atribua uma categoria à transação obrigatoriamente. Escolha a categoria mais adequada a partir deste grupo fechado de opções permitidas: [${categoriesList}].
6. Atribua uma seção de orçamento ("section") obrigatoriamente. Escolha uma das seções a partir deste grupo fechado de opções permitidas: [${activeSections.map(s => s.id).join(', ')}]. Dica: compras de cartão de crédito devem ser mapeadas para o ID do cartão correspondente, despesas fixas para "despesas_fixas", dinheiro físico ou gastos gerais do dia a dia para "gastos_diarios", etc.
7. Defina o campo "confidence" de 0 a 100 (inteiro), representando a certeza estimada da IA sobre a classificação da categoria e seção.

REDAÇÃO DE DÚVIDAS (questions):
Se você tiver qualquer dúvida ou ambiguidade sobre uma transação específica (ex: estabelecimento com nome desconhecido, PIX sem descrição, valores indefinidos), você deve incluí-la no array "questions".
- Associe a dúvida à transação correspondente fornecendo o índice da transação (0-indexed) no array "transactions" (campo transactionIndex).
- Defina o campo "property" que está em dúvida (pode ser "category" ou "section").
- Escreva uma pergunta simples, curta e amigável em português no campo "question" para que o usuário esclareça (ex: "O gasto de R$ 45,00 em 'CINE GLORIA' é de Lazer ou Educação?").
- Sugira até 4 opções de resposta adequadas (categorias ou seções) no array "options".
- Mesmo que inclua uma dúvida, atribua sua melhor suposição ("best guess") aos campos correspondentes no array "transactions".`

  const prompt = `Analise o documento a seguir e extraia as transações financeiras.
Nome do Arquivo: ${fileName}
Conteúdo do Documento:
${fileText}
`

  // Esquema de saída JSON Schema estrito para o Gemini
  const responseSchema = {
    type: 'object',
    properties: {
      transactions: {
        type: 'array',
        description: 'Lista de todas as transações financeiras detectadas no documento.',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Data da transação no formato YYYY-MM-DD.' },
            type: { type: 'string', enum: ['income', 'expense'], description: 'Tipo da transação: entrada ou despesa.' },
            section: { type: 'string', description: `ID da seção do orçamento. Escolha estritamente um destes valores: ${activeSections.map(s => s.id).join(', ')}.` },
            description: { type: 'string', description: 'Nome limpo e amigável do estabelecimento ou descrição da transação.' },
            amount: { type: 'number', description: 'Valor positivo da transação.' },
            category: { type: 'string', enum: Object.keys(Category), description: 'Categoria da transação.' },
            confidence: { type: 'integer', description: 'Nível de certeza da classificação (0-100).' }
          },
          required: ['date', 'type', 'section', 'description', 'amount', 'category', 'confidence']
        }
      },
      questions: {
        type: 'array',
        description: 'Lista de dúvidas ou ambiguidades para o usuário responder e esclarecer.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Identificador único da dúvida (gerado como uuid ou string curta).' },
            transactionIndex: { type: 'integer', description: 'O índice correspondente da transação sob dúvida no array "transactions".' },
            transactionRaw: { type: 'string', description: 'A linha ou descrição bruta da transação no documento original.' },
            question: { type: 'string', description: 'Pergunta simples e direta para o usuário em português.' },
            property: { type: 'string', enum: ['category', 'section', 'type'], description: 'Qual propriedade da transação está sob dúvida.' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Opções sugeridas de resposta de acordo com as categorias/seções permitidas.'
            }
          },
          required: ['id', 'transactionIndex', 'transactionRaw', 'question', 'property', 'options']
        }
      }
    },
    required: ['transactions', 'questions']
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 0.1 // Baixa temperatura para resultados consistentes
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const responseData = await response.json()
  const contentText = responseData.candidates?.[0]?.content?.parts?.[0]?.text

  if (!contentText) {
    throw new Error('O Gemini retornou uma resposta sem conteúdo.')
  }

  const usage = responseData.usageMetadata ? {
    promptTokens: responseData.usageMetadata.promptTokenCount,
    completionTokens: responseData.usageMetadata.candidatesTokenCount,
    totalTokens: responseData.usageMetadata.totalTokenCount
  } : undefined

  try {
    const parsedResult = JSON.parse(contentText)
    return {
      transactions: parsedResult.transactions || [],
      questions: parsedResult.questions || [],
      usage
    }
  } catch (err) {
    console.error('Falha ao interpretar JSON retornado pelo Gemini:', contentText)
    throw new Error('O formato retornado pelo Gemini não é um JSON válido.')
  }
}
