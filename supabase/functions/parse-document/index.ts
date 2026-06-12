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
5. Atribua uma categoria obrigatória. Escolha estritamente a categoria mais adequada destas opções: [${categories}].
6. Atribua uma seção obrigatória ("section"). Escolha estritamente uma destas opções: [${activeSections.map((s: any) => s.id).join(', ')}]. Dica: compras de cartão de crédito devem ser mapeadas para o ID do cartão correspondente, despesas fixas para "despesas_fixas", dinheiro físico ou gastos gerais para "gastos_diarios", etc.
7. Defina um campo "confidence" de 0 a 100 (inteiro), indicando o nível de certeza estimado sobre a categoria e seção atribuídas.

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

    // Tenta primeiro o Google Gemini 2.5 Flash (mais estável e sem limites rígidos de TPM)
    try {
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw new Error('Gemini API key is not configured.')
      }
      
      const geminiSystemInstruction = `You are a precise financial assistant. Extract ALL transactions from the text into JSON.
Output JSON structure strictly:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "type": "income" | "expense",
      "section": "section_id",
      "description": "clean_description",
      "amount": 12.34,
      "category": "CATEGORY_NAME",
      "confidence": 95
    }
  ],
  "questions": [
    {
      "id": "short_id",
      "transactionIndex": 0,
      "transactionRaw": "raw_row_text",
      "question": "Friendly question in Portuguese to clarify category/section",
      "property": "category" | "section" | "type",
      "options": ["opt1", "opt2"]
    }
  ]
}`

      const responseSchema = {
        type: 'OBJECT',
        properties: {
          transactions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                date: { type: 'STRING' },
                type: { type: 'STRING', enum: ['income', 'expense'] },
                section: { type: 'STRING' },
                description: { type: 'STRING' },
                amount: { type: 'NUMBER' },
                category: { type: 'STRING' },
                confidence: { type: 'INTEGER' }
              },
              required: ['date', 'type', 'section', 'description', 'amount', 'category', 'confidence']
            }
          },
          questions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                transactionIndex: { type: 'INTEGER' },
                transactionRaw: { type: 'STRING' },
                question: { type: 'STRING' },
                property: { type: 'STRING', enum: ['category', 'section', 'type'] },
                options: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['id', 'transactionIndex', 'transactionRaw', 'question', 'property', 'options']
            }
          }
        },
        required: ['transactions', 'questions']
      }

      const geminiModels = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']
      
      for (const currentModel of geminiModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${geminiApiKey}`
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: geminiSystemInstruction }] },
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.1
              }
            })
          })

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json()
            const contentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
            if (contentText) {
              try {
                const parsed = JSON.parse(contentText)
                parsed.provider = 'gemini'
                return new Response(JSON.stringify(parsed), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
              } catch (e) {
                return new Response(contentText, {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
              }
            }
          } else {
            const errText = await geminiResponse.text()
            console.warn(`Gemini Edge Function model ${currentModel} failed with status ${geminiResponse.status}: ${errText}`)
          }
        } catch (err: any) {
          console.warn(`Exception in Edge Function calling Gemini model ${currentModel}:`, err)
        }
      }
    } catch (geminiErr: any) {
      console.warn('Google Gemini Edge Function call failed, falling back to Groq...', geminiErr)
    }
    }

    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b']
    let response: any = null
    let responseData: any = null
    let contentText = ''
    let lastErrorMsg = ''

    for (let i = 0; i < models.length; i++) {
      const currentModel = models[i]
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: currentModel,
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
          let parsedJson: any = null
          try {
            parsedJson = JSON.parse(errorText)
          } catch (e) {}

          const cleanMsg = parsedJson?.error?.message || errorText
          lastErrorMsg = `Erro no modelo ${currentModel}: ${cleanMsg}`
          console.warn(`Groq model ${currentModel} failed in Edge Function with status ${response.status}. Msg: ${cleanMsg}`)

          if (response.status === 401 || response.status === 403) {
            break
          }
          continue
        }

        responseData = await response.json()
        contentText = responseData.choices?.[0]?.message?.content || ''
        if (!contentText) {
          lastErrorMsg = `O modelo ${currentModel} retornou resposta vazia.`
          continue
        }

        break
      } catch (err: any) {
        lastErrorMsg = `Exceção ao chamar ${currentModel}: ${err.message || err}`
        console.warn(`Exception in Edge Function calling Groq model ${currentModel}:`, err)
        continue
      }
    }

    if (!responseData || !contentText) {
      throw new Error(lastErrorMsg || 'Falha ao processar o documento em todos os modelos do Groq.')
    }

    try {
      const parsed = JSON.parse(contentText)
      parsed.provider = 'groq'
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (e) {
      return new Response(contentText, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
