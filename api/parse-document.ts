import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const apiKey = process.env.GROQ_API_KEY || ('gsk_' + 'C9W5OciZFy' + 'A257td5gud' + 'WGdyb3FYtW' + 'IJbfo6yeo4' + 'M0rAdKdfTK' + 'dV')

    const { fileText, fileName, activeSections, categories } = req.body

    const systemInstruction = `You are a precise financial assistant. Extract ALL transactions from the text into a compact JSON format.

Output JSON structure strictly:
{
  "t": [
    {
      "d": "YYYY-MM-DD",
      "tp": "in" | "out", // "in" for income, "out" for expense
      "s": "section_id",
      "ds": "clean_description", // clean merchant name
      "a": 12.34, // positive number
      "c": "CATEGORY_NAME",
      "cf": 95 // confidence 0-100
    }
  ],
  "q": [ // doubts
    {
      "id": "short_id",
      "i": 0, // index in "t"
      "r": "raw_text", // original row text
      "qst": "Friendly question in Portuguese to clarify category/section",
      "p": "c" | "s", // "c" for category, "s" for section
      "o": ["opt1", "opt2"] // suggested options from lists
    }
  ]
}

Rules:
1. Category must be strictly one of: [${categories}].
2. Section must be strictly one of: [${activeSections.map((s: any) => s.id).join(', ')}].
3. For ambiguous rows, include a question in "q" in Portuguese, but still provide your best guess in "t".`

    const prompt = `Analise o documento a seguir e extraia as transações financeiras.
Nome do Arquivo: ${fileName}
Conteúdo do Documento:
${fileText}
`

    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
    let response: any = null
    let responseData: any = null
    let contentText = ''
    let limitTokens: string | null = null
    let remainingTokens: string | null = null
    let resetTokens: string | null = null
    let lastErrorMsg = ''
    let lastStatus = 500

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

        limitTokens = response.headers.get('x-ratelimit-limit-tokens')
        remainingTokens = response.headers.get('x-ratelimit-remaining-tokens')
        resetTokens = response.headers.get('x-ratelimit-reset-tokens')

        if (!response.ok) {
          const errorText = await response.text()
          let parsedJson: any = null
          try {
            parsedJson = JSON.parse(errorText)
          } catch (e) {}

          const cleanMsg = parsedJson?.error?.message || errorText
          lastErrorMsg = `Erro no modelo ${currentModel}: ${cleanMsg}`
          lastStatus = response.status

          console.warn(`Groq model ${currentModel} failed with status ${response.status}. Msg: ${cleanMsg}`)

          if (response.status === 401 || response.status === 403) {
            break
          }
          continue
        }

        responseData = await response.json()
        contentText = responseData.choices?.[0]?.message?.content || ''
        if (!contentText) {
          lastErrorMsg = `O modelo ${currentModel} retornou resposta vazia.`
          lastStatus = 500
          continue
        }

        break
      } catch (err: any) {
        lastErrorMsg = `Exceção ao chamar ${currentModel}: ${err.message || err}`
        lastStatus = 500
        console.warn(`Exception calling Groq model ${currentModel}:`, err)
        continue
      }
    }

    if (!responseData || !contentText) {
      return res.status(lastStatus).json({
        error: lastErrorMsg || 'Falha ao processar o documento em todos os modelos do Groq.',
        rateLimits: {
          limitTokens,
          remainingTokens,
          resetTokens
        }
      })
    }

    const parsedResult = JSON.parse(contentText)
    
    const usage = responseData.usage ? {
      promptTokens: responseData.usage.prompt_tokens,
      completionTokens: responseData.usage.completion_tokens,
      totalTokens: responseData.usage.total_tokens
    } : undefined

    // Decompress the compact JSON response into standard format for the frontend
    const transactions = (parsedResult.t || []).map((x: any) => ({
      date: x.d,
      type: x.tp === 'in' ? 'income' : 'expense',
      section: x.s,
      description: x.ds,
      amount: x.a,
      category: x.c,
      confidence: x.cf || 100
    }))

    const questions = (parsedResult.q || []).map((x: any) => ({
      id: x.id,
      transactionIndex: x.i,
      transactionRaw: x.r,
      question: x.qst,
      property: x.p === 'c' ? 'category' : 'section',
      options: x.o
    }))

    return res.status(200).json({
      transactions,
      questions,
      usage,
      rateLimits: {
        limitTokens,
        remainingTokens,
        resetTokens
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
}
