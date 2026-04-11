import { Bank, BankConnection } from './openBanking'

const REDIRECT_URI = `${window.location.origin}/ir-report`

export interface OAuthFlowState {
  bankId: string
  codeVerifier: string
  state: string
  initiatedAt: string
}

// Armazenar estado do fluxo OAuth em memória
let currentOAuthFlow: OAuthFlowState | null = null

// Gerar código verifier e challenge para PKCE
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Gerar state aleatório
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// Criar hash SHA-256 do code verifier (para code challenge)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Iniciar fluxo OAuth com o banco
export async function initiateOAuthFlow(bank: Bank): Promise<{ url: string; state: string }> {
  const apiUrl = import.meta.env.VITE_API_URL
  
  if (!apiUrl) {
    throw new Error('API URL não configurada. Configure VITE_API_URL no arquivo .env')
  }

  const clientId = import.meta.env.VITE_OPEN_BANKING_CLIENT_ID
  
  if (!clientId) {
    throw new Error('Client ID do Open Banking não configurado. Configure VITE_OPEN_BANKING_CLIENT_ID no arquivo .env')
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  // Armazenar estado temporário
  currentOAuthFlow = {
    bankId: bank.id,
    codeVerifier,
    state,
    initiatedAt: new Date().toISOString(),
  }

  // Construir URL de autorização
  // Nota: Os endpoints reais variam por banco, aqui é um exemplo genérico
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: bank.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `${bank.authEndpoint}/oauth/authorize?${params.toString()}`

  return { url: authUrl, state }
}

// Processar callback do OAuth
export async function handleOAuthCallback(code: string, originalState: string): Promise<BankConnection | null> {
  if (!currentOAuthFlow) {
    console.error('Nenhum fluxo OAuth pendente')
    return null
  }

  if (currentOAuthFlow.state !== originalState) {
    console.error('State não corresponde - possível ataque CSRF')
    return null
  }

  // Aqui seria a troca do código pelo token
  // Em produção, isso seria uma chamada ao backend
  try {
    const tokenResponse = await exchangeCodeForToken(code, currentOAuthFlow.codeVerifier)
    
    if (tokenResponse.access_token) {
      const connection: BankConnection = {
        id: crypto.randomUUID(),
        bankId: currentOAuthFlow.bankId,
        bankName: '',
        logo: '',
        connectedAt: new Date().toISOString(),
        lastSync: null,
        status: 'connected',
      }

      // Limpar estado
      currentOAuthFlow = null

      return connection
    }
  } catch (error) {
    console.error('Erro ao trocar código por token:', error)
  }

  currentOAuthFlow = null
  return null
}

// Trocar authorization code por access token
async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<{ access_token?: string; refresh_token?: string; expires_in?: number }> {
  const apiUrl = import.meta.env.VITE_API_URL
  
  if (!apiUrl) {
    throw new Error('API URL não configurada. Configure VITE_API_URL no arquivo .env')
  }
  
  const response = await fetch(`${apiUrl}/api/open-banking/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error('Falha ao obter token de acesso')
  }

  return response.json()
}

// Atualizar token de acesso usando refresh token
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const apiUrl = import.meta.env.VITE_API_URL
  
  if (!apiUrl) {
    throw new Error('API URL não configurada. Configure VITE_API_URL no arquivo .env')
  }

  const response = await fetch(`${apiUrl}/api/open-banking/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Falha ao atualizar token')
  }

  return response.json()
}

// Desconectar banco (revogar tokens)
export async function disconnectBank(connectionId: string): Promise<boolean> {
  const apiUrl = import.meta.env.VITE_API_URL
  
  if (!apiUrl) {
    throw new Error('API URL não configurada. Configure VITE_API_URL no arquivo .env')
  }

  try {
    await fetch(`${apiUrl}/api/open-banking/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ connectionId }),
    })
    return true
  } catch {
    return false
  }
}

// Verificar se há um fluxo OAuth pendente
export function hasPendingOAuthFlow(): boolean {
  if (!currentOAuthFlow) return false
  
  // Flow expires after 10 minutes
  const initiatedAt = new Date(currentOAuthFlow.initiatedAt).getTime()
  const now = Date.now()
  return now - initiatedAt < 10 * 60 * 1000
}

// Cancelar fluxo OAuth
export function cancelOAuthFlow(): void {
  currentOAuthFlow = null
}