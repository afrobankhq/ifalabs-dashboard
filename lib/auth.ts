// Authentication service for JWT token management
import { tokenService } from './token-service'

// Route through local proxy by default to avoid CORS and simplify paths
// In browser: always use /api/proxy to avoid CORS issues
// On server: use direct URL or fallback
const API_BASE_URL = typeof window !== 'undefined' 
  ? '/api/proxy'  // Always use proxy in browser to avoid CORS
  : (process.env.PROXY_UPSTREAM_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

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
  private discoveredAuthPaths: { login?: string; register?: string; logout?: string; refresh?: string; verify?: string } | null = null
  private currentUserId: string | null = null

  private async fetchJsonWithFallback<T>(paths: string[], init: RequestInit): Promise<{ data: T; response: Response; url: string }> {
    const attempts: string[] = []
    console.log('[Auth] API_BASE_URL:', API_BASE_URL)
    for (const path of paths) {
      const url = `${API_BASE_URL}${path}`
      console.log('[Auth] Attempting URL:', url)
      const resp = await fetch(url, init)
      const contentType = resp.headers.get('content-type') || ''
      console.log('[Auth] Response status:', resp.status, 'Content-Type:', contentType)
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json() as T
        return { data, response: resp, url }
      }
      try {
        if (contentType.includes('application/json')) {
          const errJson = await resp.json()
          console.log('[Auth] Error response:', errJson)
          
          // Extract error message from various possible fields
          const errorMessage = errJson?.error || errJson?.message || errJson?.detail || 'json error'
          
          // For authentication failures (401), throw immediately with user-friendly message
          if (resp.status === 401) {
            throw new Error('Authentication failed: invalid credentials, either your username or password is incorrect. Please try again')
          }
          
          attempts.push(`${resp.status} ${resp.statusText} at ${url} (${errorMessage})`)
        } else {
          const errText = await resp.text()
          console.log('[Auth] Error text:', errText)
          
          // For authentication failures (401), throw immediately with user-friendly message
          if (resp.status === 401) {
            throw new Error('Authentication failed: invalid credentials, either your username or password is incorrect. Please try again')
          }
          
          attempts.push(`${resp.status} ${resp.statusText} at ${url} (non-JSON: ${errText.slice(0, 80)})`)
        }
      } catch (e) {
        // If we already threw a user-friendly error, re-throw it
        if (e instanceof Error && e.message.includes('Authentication failed')) {
          throw e
        }
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
      this.currentUserId = data.id

      // Check and assign default subscription plan if needed
      await this.ensureDefaultSubscriptionPlan(data.id, data.access_token)

      return mapped
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed')
    }
  }

  // Register new user (legacy - direct signup without email verification)
  async signup(signupData: SignupData): Promise<AuthResponse> {
    try {
      const envRegister = process.env.NEXT_PUBLIC_AUTH_REGISTER_PATH
      // Build payload per Swagger schema
      // Split name into first and last name if not provided separately
      const nameParts = (signupData.firstName && signupData.lastName) 
        ? [signupData.firstName, signupData.lastName]
        : signupData.name.split(' ')
      
      const firstName = nameParts[0] || 'User'
      const lastName = nameParts.slice(1).join(' ') || 'Account'
      
      const signupPayload: any = {
        description: signupData.description ?? '',
        email: signupData.email,
        first_name: firstName,
        last_name: lastName,
        name: signupData.name,
        password: signupData.password,
      }
      
      // Only include website if it's a valid URL
      if (signupData.website && signupData.website.trim() && signupData.website.trim() !== 'N/A') {
        signupPayload.website = signupData.website.trim()
      }

      if (!envRegister) {
        throw new Error('Auth register path not configured. Set NEXT_PUBLIC_AUTH_REGISTER_PATH.')
      }
      
      // Call signup endpoint
      console.log('[Auth] Signup URL:', `${API_BASE_URL}${envRegister}`)
      console.log('[Auth] Signup payload:', JSON.stringify(signupPayload, null, 2))
      const { data: signupResponse } = await this.fetchJsonWithFallback<{id: string, message: string}>([envRegister], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      })
      
      // After successful signup, automatically login to get user data and token
      const loginCredentials = {
        email: signupData.email,
        password: signupData.password
      }
      
      const envLogin = process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH
      if (!envLogin) {
        throw new Error('Auth login path not configured. Set NEXT_PUBLIC_AUTH_LOGIN_PATH.')
      }
      
      const { data: loginData } = await this.fetchJsonWithFallback<LoginApiResponse>([envLogin], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginCredentials),
      })
      
      // Map backend response to app AuthResponse
      const mapped: AuthResponse = {
        token: loginData.access_token,
        user: {
          id: loginData.id,
          name: loginData.name,
          email: loginData.email,
        },
      }
      
      // Store tokens and user data
      this.setToken(mapped.token)
      this.setUser(mapped.user)
      this.currentUserId = mapped.user.id

      // Check and assign default subscription plan for new user
      await this.ensureDefaultSubscriptionPlan(mapped.user.id, mapped.token)

      return mapped
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed')
    }
  }

  // Initiate email verification for registration
  async initiateEmailVerification(email: string): Promise<{ message: string }> {
    try {
      const response = await fetch('/api/auth/register/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email')
      }

      return { message: data.message || 'Verification email sent successfully' }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send verification email')
    }
  }

  // Verify email token
  async verifyEmailToken(token: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const response = await fetch(`/api/auth/register/verify?token=${encodeURIComponent(token)}`)
      const data = await response.json()

      if (!response.ok || !data.valid) {
        return { valid: false }
      }

      return { valid: true, email: data.email }
    } catch (error) {
      return { valid: false }
    }
  }

  // Complete registration after email verification
  async completeRegistration(data: {
    token: string
    name: string
    firstName: string
    lastName: string
    password: string
    description?: string
    website?: string
  }): Promise<{ id: string; email: string; message: string }> {
    try {
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          name: data.name,
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
          description: data.description || '',
          website: data.website || '',
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to complete registration')
      }

      return {
        id: responseData.id,
        email: responseData.email,
        message: responseData.message || 'Registration completed successfully',
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to complete registration')
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
      
      // Get user ID from token for ID substitution
      const userId = this.currentUserId || this.extractUserIdFromToken(token) || ''
      
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

  // Get current user from API
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = this.getToken()
      if (!token) {
        console.log('[Auth] getCurrentUser: no token')
        return null
      }

      // Try to get user ID from stored value first, then from token
      let userId = this.currentUserId
      if (!userId) {
        console.log('[Auth] getCurrentUser: extracting user ID from token')
        userId = this.extractUserIdFromToken(token)
        console.log('[Auth] getCurrentUser: extracted user ID', userId)
      } else {
        console.log('[Auth] getCurrentUser: using stored user ID', userId)
      }

      if (!userId) {
        console.log('[Auth] getCurrentUser: no user ID available')
        return null
      }

      // Get user profile from API using the user ID
      console.log('[Auth] getCurrentUser: fetching profile from API', userId)
      const { apiService } = await import('./api')
      const profileResponse = await apiService.getCompanyProfile(userId)
      const profile = profileResponse.data
      
      if (!profile) {
        console.log('[Auth] getCurrentUser: no profile data received')
        return null
      }

      // Store the user ID for future use
      this.currentUserId = profile.id
      console.log('[Auth] getCurrentUser: success', { id: profile.id, name: profile.name, email: profile.email })

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      }
    } catch (error) {
      console.error('[Auth] getCurrentUser: error', error)
      return null
    }
  }

  // Extract user ID from JWT token
  private extractUserIdFromToken(token: string): string | null {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.')
      if (parts.length !== 3) return null

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]))
      
      // Look for user ID in common JWT claims
      return payload.sub || payload.user_id || payload.id || payload.userId || null
    } catch (error) {
      console.error('Error extracting user ID from token:', error)
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

  // Get stored refresh token (not used in API-only approach)
  getRefreshToken(): string | null {
    return null
  }

  // Set token
  private setToken(token: string): void {
    tokenService.setToken(token)
  }

  // Set refresh token (not used in API-only approach)
  private setRefreshToken(refreshToken: string): void {
    // No-op in API-only approach
  }

  // Set user data (not used in API-only approach)
  private setUser(user: AuthUser): void {
    // No-op in API-only approach - user data is fetched from API
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
    tokenService.removeToken()
    this.currentUserId = null
  }
}

// Create singleton instance
export const authService = new AuthService()
