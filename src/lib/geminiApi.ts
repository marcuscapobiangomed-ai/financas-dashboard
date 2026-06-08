import { Category } from '../types/category'

export interface ParsedTransaction {
  date: string
  type: 'income' | 'expense'
  section: string
  description: string
  amount: number
  category: Category
}

export interface ParsingQuestion {
  id: string
  transactionIndex: number
  transactionRaw: string
  question: string
  property: 'category' | 'section' | 'type'
  options: string[]
}

export interface GeminiParsingResult {
  transactions: ParsedTransaction[]
  questions: ParsingQuestion[]
}

export async function parseDocumentWithAI(
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
            category: { type: 'string', enum: Object.keys(Category), description: 'Categoria da transação.' }
          },
          required: ['date', 'type', 'section', 'description', 'amount', 'category']
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

  try {
    const parsedResult = JSON.parse(contentText) as GeminiParsingResult
    return {
      transactions: parsedResult.transactions || [],
      questions: parsedResult.questions || []
    }
  } catch (err) {
    console.error('Falha ao interpretar JSON retornado pelo Gemini:', contentText)
    throw new Error('O formato retornado pelo Gemini não é um JSON válido.')
  }
}
