import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('Chave de API do Groq (GROQ_API_KEY) não configurada nos segredos do Supabase.')
    }

    const { fileText, fileName, activeSections, categories } = await req.json()

    const systemInstruction = `Você é um assistente financeiro de inteligência artificial altamente preciso.
Sua tarefa é analisar o texto de extratos bancários, faturas de cartão de crédito em PDF ou planilhas de gastos e extrair TODAS as transações financeiras encontradas de forma estruturada.

Você deve retornar a resposta EXCLUSIVAMENTE como um objeto JSON válido contendo dois arrays: "transactions" e "questions".
Estrutura do JSON:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "type": "income" | "expense",
      "section": "id_da_secao",
      "description": "Descrição limpa (ex: substituir 'IFOOD *IFOOD RESTAURANTE' por 'iFood')",
      "amount": 12.34,
      "category": "NOME_DA_CATEGORIA"
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
5. Atribua uma categoria obrigatória. Escolha estritamente a categoria mais adequada destas opções: [${categories}].
6. Atribua uma seção obrigatória ("section"). Escolha estritamente uma destas opções: [${activeSections.map((s: any) => s.id).join(', ')}]. Dica: compras de cartão de crédito devem ser mapeadas para o ID do cartão correspondente, despesas fixas para "despesas_fixas", dinheiro físico ou gastos gerais para "gastos_diarios", etc.

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

    return new Response(contentText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
