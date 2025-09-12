// Authentication service for JWT token management
import { tokenService } from './token-service'

// Route through local proxy by default to avoid CORS and simplify paths
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined' ? '/api/proxy' : 'https://api.ifalabs.com')

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupData {
  name: string
  email: string
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
  description?: string
  website?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
  refreshToken?: string
}

// Backend login response shape from Swagger
interface LoginApiResponse {
  access_token: string
  email: string
  expires_in: number
  id: string
  name: string
}

class AuthService {
  private readonly TOKEN_KEY = 'auth_token'
  private readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private readonly USER_KEY = 'user_data'

  private discoveredAuthPaths: { login?: string; register?: string; logout?: string; refresh?: string; verify?: string } | null = null

  private async fetchJsonWithFallback<T>(paths: string[], init: RequestInit): Promise<{ data: T; response: Response; url: string }> {
    const attempts: string[] = []
    for (const path of paths) {
      const url = `${API_BASE_URL}${path}`
      const resp = await fetch(url, init)
      const contentType = resp.headers.get('content-type') || ''
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json() as T
        return { data, response: resp, url }
      }
      try {
        if (contentType.includes('application/json')) {
          const errJson = await resp.json()
          attempts.push(`${resp.status} ${resp.statusText} at ${url} (${errJson?.message || 'json error'})`)
        } else {
          const errText = await resp.text()
          attempts.push(`${resp.status} ${resp.statusText} at ${url} (non-JSON: ${errText.slice(0, 80)})`)
        }
      } catch {
        attempts.push(`${resp.status} ${resp.statusText} at ${url}`)
      }
    }
    throw new Error(`All endpoint candidates failed: ${attempts.join(' | ')}`)
  }

  private async discoverAuthPaths(): Promise<void> {
    if (this.discoveredAuthPaths) return
    const swaggerCandidates = [
      '/swagger/v1/swagger.json',
      '/swagger.json',
      '/openapi.json',
    ]
    for (const path of swaggerCandidates) {
      try {
        const url = `${API_BASE_URL}${path}`
        const resp = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
        if (!resp.ok) continue
        const spec = await resp.json()
        const authPaths: { login?: string; register?: string; logout?: string; refresh?: string; verify?: string } = {}
        const paths = spec?.paths || {}
        for (const p in paths) {
          const lowered = p.toLowerCase()
          // Detect login endpoints
          if (!authPaths.login && (lowered.includes('login') || lowered.includes('signin') || lowered.includes('sign-in'))) {
            authPaths.login = p
          }
          // Detect register/signup endpoints
          if (!authPaths.register && (lowered.includes('register') || lowered.includes('signup') || lowered.includes('sign-up') || lowered.includes('sign_up'))) {
            authPaths.register = p
          }
          // Detect logout
          if (!authPaths.logout && lowered.includes('logout')) {
            authPaths.logout = p
          }
          // Detect refresh
          if (!authPaths.refresh && lowered.includes('refresh')) {
            authPaths.refresh = p
          }
          // Detect verify
          if (!authPaths.verify && (lowered.includes('verify') || lowered.includes('me'))) {
            authPaths.verify = p
          }
        }
        this.discoveredAuthPaths = authPaths
        return
      } catch {
        // continue
      }
    }
    // Fallback: parse Swagger HTML to discover JSON spec URL
    try {
      const htmlResp = await fetch(`${API_BASE_URL}/swagger/index.html`, { method: 'GET', headers: { 'Accept': 'text/html' } })
      if (htmlResp.ok) {
        const html = await htmlResp.text()
        const urlMatch = html.match(/url:\s*["']([^"']+)["']/) || html.match(/urls:\s*\[\s*\{[^}]*url:\s*["']([^"']+)["']/)
        if (urlMatch && urlMatch[1]) {
          const jsonPath = urlMatch[1]
          try {
            const specResp = await fetch(jsonPath.startsWith('http') ? jsonPath : `${API_BASE_URL}${jsonPath}`, { headers: { 'Accept': 'application/json' } })
            if (specResp.ok) {
              const spec = await specResp.json()
              const authPaths: { login?: string; register?: string; logout?: string; refresh?: string; verify?: string } = {}
              const paths = spec?.paths || {}
              for (const p in paths) {
                const lowered = p.toLowerCase()
                if (!authPaths.login && (lowered.includes('login') || lowered.includes('signin') || lowered.includes('sign-in'))) {
                  authPaths.login = p
                }
                if (!authPaths.register && (lowered.includes('register') || lowered.includes('signup') || lowered.includes('sign-up') || lowered.includes('sign_up'))) {
                  authPaths.register = p
                }
                if (!authPaths.logout && lowered.includes('logout')) {
                  authPaths.logout = p
                }
                if (!authPaths.refresh && lowered.includes('refresh')) {
                  authPaths.refresh = p
                }
                if (!authPaths.verify && (lowered.includes('verify') || lowered.includes('me'))) {
                  authPaths.verify = p
                }
              }
              this.discoveredAuthPaths = authPaths
              return
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
    this.discoveredAuthPaths = {}
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const envLogin = process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH
      if (!envLogin) {
        throw new Error('Auth login path not configured. Set NEXT_PUBLIC_AUTH_LOGIN_PATH.')
      }
      const { data } = await this.fetchJsonWithFallback<LoginApiResponse>([envLogin], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      // Map backend response to app AuthResponse
      const mapped: AuthResponse = {
        token: data.access_token,
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
        },
      }

      // Store tokens and user data
      this.setToken(mapped.token)
      this.setUser(mapped.user)

      // Check and assign default subscription plan if needed
      await this.ensureDefaultSubscriptionPlan(data.id, data.access_token)

      return mapped
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed')
    }
  }

  // Register new user
  async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      const envRegister = process.env.NEXT_PUBLIC_AUTH_REGISTER_PATH
      // Build payload per Swagger schema
      const signupPayload = {
        description: signupData.description ?? '',
        email: signupData.email,
        first_name: signupData.firstName ?? '',
        last_name: signupData.lastName ?? '',
        name: signupData.name,
        password: signupData.password,
        website: (signupData.website && signupData.website.trim()) ? signupData.website.trim() : 'N/A',
      }

      if (!envRegister) {
        throw new Error('Auth register path not configured. Set NEXT_PUBLIC_AUTH_REGISTER_PATH.')
      }
      const { data } = await this.fetchJsonWithFallback<AuthResponse>([envRegister], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      })
      
      // Store tokens and user data
      this.setToken(data.token)
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken)
      }
      this.setUser(data.user)

      // Check and assign default subscription plan for new user
      await this.ensureDefaultSubscriptionPlan(data.user.id, data.token)

      return data
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed')
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const token = this.getToken()
      if (token) {
        const envLogout = process.env.NEXT_PUBLIC_AUTH_LOGOUT_PATH
        if (!envLogout) {
          // If not configured, just clear local state without calling API
        } else {
          await this.fetchJsonWithFallback<{ message?: string }>([envLogout], {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        }
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage regardless of API call success
      this.clearAuth()
    }
  }

  // Refresh access token
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        return null
      }
      const envRefresh = process.env.NEXT_PUBLIC_AUTH_REFRESH_PATH
      if (!envRefresh) {
        return null
      }
      const { data } = await this.fetchJsonWithFallback<{ token: string }>([envRefresh], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      this.setToken(data.token)
      
      return data.token
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearAuth()
      return null
    }
  }

  // Verify current token
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken()
      if (!token) {
        return false
      }
      
      // Get current user for ID substitution
      const currentUser = this.getCurrentUser()
      const userId = currentUser?.id || ''
      
      // Try environment variable first, then fallback to common auth verification endpoints
      const envVerify = process.env.NEXT_PUBLIC_AUTH_VERIFY_PATH
      let verifyPath: string
      
      if (envVerify) {
        // Check if the env path looks like a payment endpoint (incorrect)
        if (envVerify.includes('/payment')) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Auth] verifyToken: NEXT_PUBLIC_AUTH_VERIFY_PATH appears to be a payment endpoint, using fallback')
          }
          // Use fallback instead
          verifyPath = `/api/dashboard/verify`
        } else {
          // Use env path with ID substitution
          verifyPath = envVerify
            .replace('{id}', encodeURIComponent(userId))
            .replace(':id', encodeURIComponent(userId))
        }
      } else {
        // Fallback to common auth verification endpoints
        verifyPath = `/api/dashboard/verify`
      }
      
      const url = `${API_BASE_URL}${verifyPath}`
      if (process.env.NODE_ENV !== 'production') {
        try { 
          console.debug('[Auth] verifyToken →', { 
            url, 
            hasUserId: !!userId, 
            envPath: envVerify,
            finalPath: verifyPath 
          }) 
        } catch {}
      }
      
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      return resp.ok
    } catch (error) {
      // Suppress noisy verification errors; treat as not verified
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Auth] verifyToken: error during verification, treating as unverified.', error)
      }
      return false
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    
    const userData = localStorage.getItem(this.USER_KEY)
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null
    }
    try {
      return JSON.parse(userData)
    } catch (error) {
      // Clean up corrupted value and return null
      try { localStorage.removeItem(this.USER_KEY) } catch {}
      console.error('Error parsing user data:', error)
      return null
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  // Get stored token
  getToken(): string | null {
    return tokenService.getToken()
  }

  // Get stored refresh token
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  // Set token
  private setToken(token: string): void {
    tokenService.setToken(token)
  }

  // Set refresh token
  private setRefreshToken(refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
  }

  // Set user data
  private setUser(user: AuthUser): void {
    if (typeof window === 'undefined') return
    try {
      if (!user || typeof user !== 'object') return
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    } catch {
      // ignore storage errors
    }
  }

  // Ensure user has a default subscription plan
  private async ensureDefaultSubscriptionPlan(userId: string, token: string): Promise<void> {
    try {
      // Import apiService dynamically to avoid circular dependency
      const { apiService } = await import('./api')
      
      // Get user profile to check subscription plan
      const profileResponse = await apiService.getCompanyProfile(userId)
      const profile = profileResponse.data
      
      // Check if subscription plan is missing or empty
      if (!profile?.subscription_plan || profile.subscription_plan.trim() === '') {
        console.log('[Auth] Assigning default free subscription plan to user:', userId)
        
        // Assign default free tier
        await apiService.updateSubscriptionPlan(userId, 'free')
        
        console.log('[Auth] Successfully assigned free subscription plan')
      } else {
        console.log('[Auth] User already has subscription plan:', profile.subscription_plan)
      }
    } catch (error) {
      // Log error but don't fail login - subscription plan assignment is not critical
      console.warn('[Auth] Failed to ensure default subscription plan:', error)
    }
  }

  // Clear all auth data
  private clearAuth(): void {
    if (typeof window === 'undefined') return
    tokenService.removeToken()
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }
}

// Create singleton instance
export const authService = new AuthService()
