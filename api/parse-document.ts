interface VercelRequest {
  method?: string
  body: any
}

interface VercelResponse {
  setHeader: (name: string, value: string) => void
  status: (code: number) => VercelResponse
  end: () => void
  json: (body: unknown) => void
}

interface ActiveSection {
  id: string
  label?: string
}

interface GeminiResponseData {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

interface GeminiParsedResult {
  transactions?: unknown[]
  questions?: unknown[]
}

interface GroqResponseData {
  choices?: Array<{ message?: { content?: string } }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

interface GroqErrorResponse {
  error?: { message?: string }
}

interface CompactTransaction {
  d: string
  tp: 'in' | 'out'
  s: string
  ds: string
  a: number
  c: string
  cf?: number
}

interface CompactQuestion {
  id: string
  i: number
  r: string
  qst: string
  p: 'c' | 's'
  o: string[]
}

interface CompactParseResult {
  t?: CompactTransaction[]
  q?: CompactQuestion[]
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

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
    const { fileText, fileName, activeSections, categories } = req.body
    const sections = Array.isArray(activeSections) ? activeSections as ActiveSection[] : []

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
2. Section must be strictly one of: [${sections.map((s) => s.id).join(', ')}].
3. For ambiguous rows, include a question in "q" in Portuguese, but still provide your best guess in "t".`

    const prompt = `Analise o documento a seguir e extraia as transações financeiras.
Nome do Arquivo: ${fileName}
Conteúdo do Documento:
${fileText}
`

    // Tenta primeiro o Google Gemini (2.5-flash depois 1.5-flash) (mais estável e sem limites rígidos de TPM)
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
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
            const geminiData = await geminiResponse.json() as GeminiResponseData
            const contentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
            if (contentText) {
              const parsedResult = JSON.parse(contentText) as GeminiParsedResult
              const usage = geminiData.usageMetadata ? {
                promptTokens: geminiData.usageMetadata.promptTokenCount,
                completionTokens: geminiData.usageMetadata.candidatesTokenCount,
                totalTokens: geminiData.usageMetadata.totalTokenCount
              } : undefined

              return res.status(200).json({
                transactions: parsedResult.transactions || [],
                questions: parsedResult.questions || [],
                usage,
                provider: 'gemini'
              })
            }
          } else {
            const errText = await geminiResponse.text()
            console.warn(`Gemini server-side model ${currentModel} failed with status ${geminiResponse.status}: ${errText}`)
          }
        } catch (err: unknown) {
          console.warn(`Exception calling Gemini server-side model ${currentModel}:`, err)
        }
      }
    } catch (geminiErr: unknown) {
      console.warn('Google Gemini server-side call failed, falling back to Groq...', geminiErr)
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY não configurada no ambiente do servidor.' })
    }

    const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b']
    let response: Response | null = null
    let responseData: GroqResponseData | null = null
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
          let parsedJson: GroqErrorResponse | null = null
          try {
            parsedJson = JSON.parse(errorText) as GroqErrorResponse
          } catch {
            parsedJson = null
          }

          const cleanMsg = parsedJson?.error?.message || errorText
          lastErrorMsg = `Erro no modelo ${currentModel}: ${cleanMsg}`
          lastStatus = response.status

          console.warn(`Groq model ${currentModel} failed with status ${response.status}. Msg: ${cleanMsg}`)

          if (response.status === 401 || response.status === 403) {
            break
          }
          continue
        }

        responseData = await response.json() as GroqResponseData
        contentText = responseData.choices?.[0]?.message?.content || ''
        if (!contentText) {
          lastErrorMsg = `O modelo ${currentModel} retornou resposta vazia.`
          lastStatus = 500
          continue
        }

        break
      } catch (err: unknown) {
        lastErrorMsg = `Exceção ao chamar ${currentModel}: ${getErrorMessage(err)}`
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

    const parsedResult = JSON.parse(contentText) as CompactParseResult
    
    const usage = responseData.usage ? {
      promptTokens: responseData.usage.prompt_tokens,
      completionTokens: responseData.usage.completion_tokens,
      totalTokens: responseData.usage.total_tokens
    } : undefined

    // Decompress the compact JSON response into standard format for the frontend
    const transactions = (parsedResult.t || []).map((x) => ({
      date: x.d,
      type: x.tp === 'in' ? 'income' : 'expense',
      section: x.s,
      description: x.ds,
      amount: x.a,
      category: x.c,
      confidence: x.cf || 100
    }))

    const questions = (parsedResult.q || []).map((x) => ({
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
      provider: 'groq',
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
