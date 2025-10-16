// API service layer for communicating with the backend
// Route through local proxy by default to avoid CORS and simplify paths
// In browser: always use /api/proxy to avoid CORS issues
// On server: use direct URL or fallback
const API_BASE_URL = typeof window !== 'undefined' 
  ? '/api/proxy'  // Always use proxy in browser to avoid CORS
  : (process.env.PROXY_UPSTREAM_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

export interface ApiResponse<T> {
  data: T
  message?: string
  status: number
}

export interface ApiError {
  message: string
  status: number
  details?: any
}

class ApiService {
  private baseURL: string
  private defaultHeaders: HeadersInit

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = tokenService.getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  private getApiKeyHeaders(): HeadersInit {
    // For Oracle Engine price endpoints, we need API key authentication
    const apiKey = this.getApiKey()
    return apiKey ? { 'X-API-Key': apiKey } : {}
  }

  private getApiKey(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('oracle_api_key')
  }

  public setApiKey(apiKey: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('oracle_api_key', apiKey)
  }

  public removeApiKey(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('oracle_api_key')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    suppress404Logging: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    if (process.env.NODE_ENV !== 'production') {
      // Lightweight client-side debug logging
      try {
        console.log('[ApiService] request', {
          url,
          method: options.method || 'GET',
          hasAuth: !!tokenService.getToken(),
        })
      } catch {}
    }
    // Determine if this is an Oracle Engine price endpoint that needs API key auth
    const isOraclePriceEndpoint = endpoint.includes('/api/prices/') || endpoint.includes('/api/assets')
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(isOraclePriceEndpoint ? this.getApiKeyHeaders() : this.getAuthHeaders()),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const contentType = response.headers.get('content-type') || ''
      const contentLength = Number(response.headers.get('content-length') || '0')

      let parsed: any = null
      if (response.status === 204 || contentLength === 0) {
        parsed = null
      } else if (contentType.includes('application/json')) {
        try {
          parsed = await response.json()
        } catch (jsonErr) {
          // Malformed JSON
          const text = await response.text().catch(() => '')
          throw new ApiError('Invalid JSON response', response.status, { text })
        }
      } else {
        // Non-JSON response
        parsed = await response.text().catch(() => '')
      }

      if (!response.ok) {
        // Log the full response for debugging
        if (process.env.NODE_ENV !== 'production') {
          try { 
            console.error('[ApiService] Error response:', {
              status: response.status,
              statusText: response.statusText,
              url,
              parsed,
              contentType
            }) 
          } catch {}
        }
        
        // Extract error message from various possible response formats
        let message = 'An error occurred'
        
        if (parsed) {
          if (typeof parsed === 'string') {
            message = parsed
          } else if (typeof parsed === 'object') {
            // Try different common error message fields
            message = parsed.message || 
                     parsed.error || 
                     parsed.detail || 
                     parsed.description || 
                     parsed.msg ||
                     (parsed.errors && Array.isArray(parsed.errors) ? parsed.errors.join(', ') : null) ||
                     response.statusText ||
                     'An error occurred'
          }
        } else {
          message = response.statusText || 'An error occurred'
        }
        
        throw new ApiError(message, response.status, parsed)
      }

      const apiResponse = {
        data: parsed as T,
        status: response.status,
        message: (parsed && (parsed as any).message) || undefined,
      } as ApiResponse<T>
      if (process.env.NODE_ENV !== 'production') {
        try { console.debug('[ApiService] response', { url, status: response.status, contentType }) } catch {}
      }
      return apiResponse
    } catch (error) {
      // Only log non-404 errors to reduce noise, or if 404 logging is not suppressed
      if (error instanceof ApiError && error.status === 404) {
        if (!suppress404Logging && process.env.NODE_ENV !== 'production') {
          try { console.debug('[ApiService] 404 (handled by caller)', { url, status: 404 }) } catch {}
        }
      } else {
        try { console.error('[ApiService] error', error) } catch {}
      }
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        'Network error or server unavailable',
        0,
        error
      )
    }
  }

  // Company profile
  async getCompanyProfile(id: string) {
    const tpl = process.env.NEXT_PUBLIC_COMPANY_PROFILE_PATH || ''
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(id)).replace(':id', encodeURIComponent(id))
      : null
    const candidates: string[] = []
    const primary = expand(tpl)
    if (primary) candidates.push(primary)
    // Common alternates
    candidates.push(`/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/dashboard/profile/${encodeURIComponent(id)}`)

    if (process.env.NODE_ENV !== 'production') {
      try { console.debug('[ApiService] getCompanyProfile:candidates', candidates) } catch {}
    }
    return this.requestFallback<CompanyProfile>(Array.from(new Set(candidates)))
  }

  // Update company profile
  async updateCompanyProfile(id: string, payload: {
    description?: string
    first_name?: string
    last_name?: string
    logo_url?: string
    name: string
    website?: string
    subscription_plan?: string
  }) {
    const tpl = process.env.NEXT_PUBLIC_COMPANY_PROFILE_PATH || ''
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(id)).replace(':id', encodeURIComponent(id))
      : null
    const candidates: string[] = []
    const primary = expand(tpl)
    if (primary) candidates.push(primary)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/dashboard/profile/${encodeURIComponent(id)}`)

    const unique = Array.from(new Set(candidates))
    if (process.env.NODE_ENV !== 'production') {
      try { console.debug('[ApiService] updateCompanyProfile:candidates', unique) } catch {}
    }
    return this.requestFallback<CompanyProfile>(unique, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  // Change password
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const endpoint = `/api/dashboard/${encodeURIComponent(id)}/change-password`
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to change password')
    }

    const data = await response.json()
    return {
      data: data,
      message: data.message || 'Password changed successfully',
      status: response.status
    }
  }

  // Delete company account
  async deleteCompanyAccount(id: string): Promise<ApiResponse<{ message: string }>> {
    // First, try the local account deletion endpoint (doesn't go through proxy)
    try {
      const localEndpoint = `/api/account/delete?userId=${encodeURIComponent(id)}`
      const response = await fetch(localEndpoint, {
        method: 'DELETE',
        headers: {
          ...this.defaultHeaders,
          ...this.getAuthHeaders(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[ApiService] deleteCompanyAccount: Local deletion successful')
        return {
          data: data.data || { message: data.message },
          message: data.message || 'Account deleted successfully',
          status: response.status
        }
      }
    } catch (localError) {
      console.warn('[ApiService] deleteCompanyAccount: Local endpoint failed, trying fallback endpoints', localError)
    }

    // If local endpoint fails, try various common delete endpoints through the proxy
    const tpl = process.env.NEXT_PUBLIC_COMPANY_PROFILE_PATH || ''
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(id)).replace(':id', encodeURIComponent(id))
      : null
    const candidates: string[] = []
    const primary = expand(tpl)
    if (primary) candidates.push(primary)
    
    // Try various common delete endpoints
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}`)
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/profile`)
    candidates.push(`/dashboard/profile/${encodeURIComponent(id)}`)
    candidates.push(`/api/companies/${encodeURIComponent(id)}`)
    candidates.push(`/companies/${encodeURIComponent(id)}`)
    candidates.push(`/api/users/${encodeURIComponent(id)}`)
    candidates.push(`/users/${encodeURIComponent(id)}`)

    const unique = Array.from(new Set(candidates))
    if (process.env.NODE_ENV !== 'production') {
      try { console.debug('[ApiService] deleteCompanyAccount:candidates', unique) } catch {}
    }
    
    try {
      const result = await this.requestFallback<{ message: string }>(unique, {
        method: 'DELETE',
      })
      console.log('[ApiService] deleteCompanyAccount: Backend deletion successful')
      return result
    } catch (error) {
      // Silently handle the error - backend deletion endpoint doesn't exist or failed
      console.warn('[ApiService] deleteCompanyAccount: Backend deletion unavailable, returning success for local cleanup')
      
      // Return a simulated success response to allow frontend to proceed with local cleanup
      // This is intentional - we want to clear local data even if backend fails
      return {
        data: { message: 'Account deletion initiated (local cleanup only)' },
        message: 'Backend deletion unavailable - local cleanup will proceed',
        status: 200
      }
    }
  }

  // Update subscription plan specifically
  async updateSubscriptionPlan(id: string, subscriptionPlan: string) {
    // Try the dedicated subscription endpoint first
    const subscriptionEndpoint = `/api/dashboard/${encodeURIComponent(id)}/subscription`
    
    try {
      // Try dedicated subscription endpoint
      return await this.request<CompanyProfile>(subscriptionEndpoint, {
        method: 'PUT',
        body: JSON.stringify({ subscription_plan: subscriptionPlan }),
      })
    } catch (err) {
      console.log('Dedicated subscription endpoint failed, trying profile update:', err)
      // Fallback to profile update method
      return this.updateCompanyProfile(id, { 
        name: '', // Required field, will be ignored by backend
        subscription_plan: subscriptionPlan 
      })
    }
  }

  // Refresh user profile from backend (useful after login to get latest data)
  async refreshUserProfile(id: string) {
    try {
      const response = await this.getCompanyProfile(id)
      if (response && response.data) {
        // Update localStorage with fresh data from backend
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_profile', JSON.stringify(response.data))
          localStorage.setItem('subscription_plan', response.data.subscription_plan || 'free')
          
          // Dispatch event to notify other components
          window.dispatchEvent(new CustomEvent('profileRefreshed', { 
            detail: { 
              profile: response.data,
              subscription_plan: response.data.subscription_plan,
              timestamp: Date.now(),
              source: 'backend_refresh'
            } 
          }))
        }
        return response
      }
    } catch (err) {
      console.error('Failed to refresh user profile from backend:', err)
      throw err
    }
  }

  // Profile API keys
  // Helper function to normalize API key data from different possible response formats
  private normalizeApiKeyData(rawData: any, userSubscriptionPlan?: string): ApiKey {
    console.log('[ApiService] normalizeApiKeyData:input', rawData)
    console.log('[ApiService] normalizeApiKeyData:all-fields', Object.keys(rawData))
    
    const normalized = {
      id: rawData.id || rawData.key_id || rawData.api_key_id || '',
      key: rawData.key || rawData.api_key || rawData.token || rawData.secret || '',
      name: rawData.name || rawData.key_name || rawData.title || '',
      subscription_plan: rawData.subscription_plan || rawData.plan || rawData.subscription || rawData.tier || userSubscriptionPlan || 'free',
      is_active: rawData.is_active !== undefined ? rawData.is_active : (rawData.active !== undefined ? rawData.active : true),
      last_used: rawData.last_used || rawData.last_accessed || rawData.used_at || '',
      created_at: rawData.created_at || rawData.created || rawData.createdAt || '',
      updated_at: rawData.updated_at || rawData.updated || rawData.updatedAt || '',
      profile_id: rawData.profile_id || rawData.user_id || rawData.owner_id || '',
      // Keep original fields for debugging
      api_key: rawData.api_key,
      token: rawData.token,
      secret: rawData.secret,
      plan: rawData.plan,
      subscription: rawData.subscription,
    }
    
    console.log('[ApiService] normalizeApiKeyData:output', normalized)
    return normalized
  }

  async getProfileApiKeys(id: string) {
    const template = process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(id)).replace(':id', encodeURIComponent(id))
      : null
    
    const candidates: string[] = []
    const primary = expand(template || '')
    if (primary) candidates.push(primary)
    
    // Common fallback endpoints for API keys
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/api-keys`)
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/keys`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/api-keys`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/keys`)
    candidates.push(`/api/dashboard/profiles/${encodeURIComponent(id)}/keys`)
    candidates.push(`/dashboard/profiles/${encodeURIComponent(id)}/keys`)

    console.log('[ApiService] getProfileApiKeys:starting', { id, candidates })

    // Try all candidates, but treat 404s as empty list
    let lastError: unknown = null
    for (const endpoint of candidates) {
      try {
        const response = await this.request<any[]>(endpoint, {}, true) // Suppress 404 logging
        console.log('[ApiService] getProfileApiKeys:success', { endpoint, id, response, rawData: response.data })
        console.log('[ApiService] getProfileApiKeys:rawData-detail', response.data)
        
        // Get user's subscription plan from profile
        let userSubscriptionPlan = 'free' // default
        try {
          const profileResponse = await this.getCompanyProfile(id)
          userSubscriptionPlan = profileResponse.data?.subscription_plan || 'free'
          console.log('[ApiService] getProfileApiKeys:user-subscription', { userSubscriptionPlan })
        } catch (err) {
          console.log('[ApiService] getProfileApiKeys:profile-fetch-failed', err)
        }

        // Normalize the response data
        const normalizedData = response.data.map(item => this.normalizeApiKeyData(item, userSubscriptionPlan))
        console.log('[ApiService] getProfileApiKeys:normalized', normalizedData)
        
        return {
          ...response,
          data: normalizedData
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
        console.log('[ApiService] getProfileApiKeys: 404 treated as empty list', { endpoint, id })
          return { data: [], status: 404, message: 'No API keys found' }
        }
        lastError = err
      }
    }
    
    // If we get here, all endpoints failed with non-404 errors
    if (lastError instanceof ApiError) throw lastError
    throw new ApiError('All API key endpoints failed', 0, lastError)
  }

  // Create new API key for a profile
  async createProfileApiKey(id: string, payload: { name: string }) {
    const template = process.env.NEXT_PUBLIC_PROFILE_KEYS_CREATE_PATH || '/dashboard/{id}/api-keys'
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(id)).replace(':id', encodeURIComponent(id))
      : null
    
    const candidates: string[] = []
    const primary = expand(template)
    if (primary) candidates.push(primary)
    
    // Common fallback endpoints for creating API keys
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/api-keys`)
    candidates.push(`/api/dashboard/${encodeURIComponent(id)}/keys`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/api-keys`)
    candidates.push(`/dashboard/${encodeURIComponent(id)}/keys`)
    candidates.push(`/api/dashboard/profiles/${encodeURIComponent(id)}/keys`)
    candidates.push(`/dashboard/profiles/${encodeURIComponent(id)}/keys`)

    console.log('[ApiService] createProfileApiKey:candidates', {
          candidates,
          profileId: id,
          payload
        })
  
    const response = await this.requestFallback<CreatedApiKeyResponse>(candidates, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    
    console.log('[ApiService] createProfileApiKey:success', { response, payload, rawData: response.data })
    console.log('[ApiService] createProfileApiKey:rawData-detail', response.data)
    
    return response
  }

  // Create new API key for a profile (with env fallback)
  async createProfileApiKeyWithEnv(id: string, payload: { name: string }) {
    return this.createProfileApiKey(id, payload)
  }


  // Profile API usage (paginated)
  async getProfileUsage(id: string, page: number = 1, limit: number = 20) {
    const template = process.env.NEXT_PUBLIC_PROFILE_USAGE_PATH
    if (!template) {
      throw new ApiError(
        'Profile usage path is not configured. Set NEXT_PUBLIC_PROFILE_USAGE_PATH (e.g., /api/dashboard/profiles/{id}/usage).',
        404
      )
    }
    let path = template
      .replace('{id}', encodeURIComponent(id))
      .replace(':id', encodeURIComponent(id))
      .replace('{page}', String(page))
      .replace('{limit}', String(limit))

    // If template didn't include {page}/{limit}, append as query params
    if (!/[?&]page=/.test(path)) {
      const hasQuery = path.includes('?')
      path += `${hasQuery ? '&' : '?'}page=${encodeURIComponent(String(page))}`
    }
    if (!/[?&]limit=/.test(path)) {
      path += `&limit=${encodeURIComponent(String(limit))}`
    }

    return this.request<any>(path)
  }

  private async requestFallback<T>(
    endpoints: string[],
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    console.log('[ApiService] requestFallback:starting', { endpoints, method: options.method || 'GET' })
    let lastError: unknown = null
    for (const ep of endpoints) {
      try {
        console.log('[ApiService] requestFallback:trying', { endpoint: ep })
        const result = await this.request<T>(ep, options)
        console.log('[ApiService] requestFallback:success', { endpoint: ep, result })
        return result
      } catch (err) {
        console.log('[ApiService] requestFallback:failed', { endpoint: ep, error: err })
        lastError = err
      }
    }
    console.log('[ApiService] requestFallback:all-failed', { lastError })
    if (lastError instanceof ApiError) throw lastError
    throw new ApiError('All endpoints failed', 0, lastError)
  }

  // Dashboard endpoints
  async getDashboardStats() {
    const envPath = process.env.NEXT_PUBLIC_DASHBOARD_STATS_PATH
    if (!envPath) {
      throw new ApiError(
        'Dashboard stats path is not configured. Set NEXT_PUBLIC_DASHBOARD_STATS_PATH.',
        404
      )
    }
    return this.request(envPath)
  }

  async getRecentActivity() {
    const envPath = process.env.NEXT_PUBLIC_DASHBOARD_ACTIVITY_PATH
    if (!envPath) {
      throw new ApiError(
        'Dashboard activity path is not configured. Set NEXT_PUBLIC_DASHBOARD_ACTIVITY_PATH.',
        404
      )
    }
    return this.request(envPath)
  }

  // Oracle Engine Price Endpoints
  async getLastPrice(assetId?: string): Promise<ApiResponse<OraclePrice | Record<string, OraclePrice>>> {
    const endpoint = process.env.NEXT_PUBLIC_PRICES_LAST_PATH || '/api/prices/last'
    const url = assetId ? `${endpoint}?asset=${encodeURIComponent(assetId)}` : endpoint
    return this.request<OraclePrice | Record<string, OraclePrice>>(url)
  }

  async getPriceStream(): Promise<ApiResponse<EventSource>> {
    const endpoint = process.env.NEXT_PUBLIC_PRICES_STREAM_PATH || '/api/prices/stream'
    // For SSE, we'll return the endpoint URL for EventSource creation
    return this.request<EventSource>(endpoint)
  }

  async getAssets(): Promise<ApiResponse<OracleAsset[]>> {
    const endpoint = process.env.NEXT_PUBLIC_ASSETS_PATH || '/api/assets'
    return this.request<OracleAsset[]>(endpoint)
  }

  async getSubscriptionPlans(): Promise<ApiResponse<SubscriptionPlansResponse>> {
    const endpoint = process.env.NEXT_PUBLIC_SUBSCRIPTION_PLANS_PATH || '/api/subscription/plans'
    return this.request<SubscriptionPlansResponse>(endpoint)
  }

  // Oracle Engine API Keys endpoints (for price access)
  async getApiKeys() {
    return this.request('/api/keys')
  }

  async createApiKey(keyData: { name: string; environment: string }) {
    return this.request('/api/keys', {
      method: 'POST',
      body: JSON.stringify(keyData),
    })
  }

  async deleteApiKey(userId: string, keyId: string) {
    // Use the same pattern as create/get API keys
    const template = process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH || '/api/dashboard/{id}/api-keys'
    const expand = (s: string): string | null => s
      ? s.replace('{id}', encodeURIComponent(userId)).replace(':id', encodeURIComponent(userId))
      : null
    
    const basePath = expand(template)
    if (!basePath) {
      throw new Error('Invalid API keys path template')
    }

    // Try multiple endpoint patterns for API key deletion
    const candidates = [
      `${basePath}/${keyId}`,                    // Correct Oracle Engine pattern
      `/api/dashboard/${encodeURIComponent(userId)}/api-keys/${keyId}`,  // Direct pattern
      `/api/dashboard/api-keys/${keyId}`,        // Fallback pattern
      `/api/keys/${keyId}`,                      // Generic pattern
      `/api/dashboard/keys/${keyId}`,            // Alternative pattern
    ]
    
    if (process.env.NODE_ENV !== 'production') {
      try { console.debug('[ApiService] deleteApiKey:candidates', candidates) } catch {}
    }
    
    return this.requestFallback(candidates, {
      method: 'DELETE',
    })
  }

  async updateApiKey(keyId: string, keyData: { name?: string; status?: string }) {
    return this.request(`/api/keys/${keyId}`, {
      method: 'PUT',
      body: JSON.stringify(keyData),
    })
  }

  // Account endpoints
  async getUserProfile() {
    return this.request('/api/user/profile')
  }

  async updateUserProfile(profileData: any) {
    return this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async updateNotificationSettings(settings: any) {
    return this.request('/api/user/notifications', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // Billing endpoints
  async getBillingInfo() {
    return this.request('/api/billing/info')
  }

  async getInvoices() {
    return this.request('/api/billing/invoices')
  }

  async downloadInvoice(invoiceId: string) {
    return this.request(`/api/billing/invoices/${invoiceId}/download`)
  }

  // Plan endpoints
  async getPlans() {
    return this.request('/api/plans')
  }

  async getCurrentPlan() {
    return this.request('/api/plans/current')
  }

  async updatePlan(planId: string) {
    return this.request(`/api/plans/${planId}`, {
      method: 'PUT',
    })
  }

  async getUsageStats() {
    return this.request('/api/usage/stats')
  }

  // Status endpoints - Oracle Engine integration
  async getSystemStatus() {
    // Try Oracle Engine status endpoint first, fallback to generic endpoint
    const oracleEndpoint = process.env.NEXT_PUBLIC_ORACLE_STATUS_PATH || '/api/status'
    const fallbackEndpoints = [
      oracleEndpoint,
      '/api/status',
      '/api/health'
    ]
    return this.requestFallback(fallbackEndpoints)
  }

  async getServiceStatus() {
    const oracleEndpoint = process.env.NEXT_PUBLIC_ORACLE_SERVICES_PATH || '/api/status/services'
    const fallbackEndpoints = [
      oracleEndpoint,
      '/api/status/services',
      '/api/services'
    ]
    return this.requestFallback(fallbackEndpoints)
  }

  async getIncidents() {
    const oracleEndpoint = process.env.NEXT_PUBLIC_ORACLE_INCIDENTS_PATH || '/api/status/incidents'
    const fallbackEndpoints = [
      oracleEndpoint,
      '/api/status/incidents',
      '/api/incidents'
    ]
    return this.requestFallback(fallbackEndpoints)
  }

  async getUptimeStats() {
    const oracleEndpoint = process.env.NEXT_PUBLIC_ORACLE_UPTIME_PATH || '/api/status/uptime'
    const fallbackEndpoints = [
      oracleEndpoint,
      '/api/status/uptime',
      '/api/uptime'
    ]
    return this.requestFallback(fallbackEndpoints)
  }

  // Documentation endpoints
  async getApiEndpoints() {
    return this.request<ApiEndpoint[]>('/api/docs/endpoints')
  }

  async getApiSchema() {
    return this.request('/api/docs/schema')
  }
}

// Create a singleton instance
export const apiService = new ApiService()

// Custom error class
export class ApiError extends Error {
  public status: number
  public details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// Utility function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// Hook for API calls with loading and error states
export const useApiCall = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async <T>(
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall()
      return response.data
    } catch (err) {
      const errorMessage = handleApiError(err)
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { execute, loading, error }
}

// Import useState for the hook
import { useState } from 'react'
import { tokenService } from './token-service'

// Shared API docs types
export type ApiEndpoint = {
  method: string
  endpoint: string
  description: string
  parameters: string[]
}

// Company profile type (from Swagger)
export type CompanyProfile = {
  created_at: string
  description: string
  email: string
  first_name: string
  id: string
  last_name: string
  logo_url: string
  name: string
  subscription_plan: string
  updated_at: string
  website: string
}

export type ApiKey = {
  created_at: string
  id: string
  is_active: boolean
  key: string
  last_used: string
  name: string
  profile_id: string
  subscription_plan: string
  updated_at: string
  // Alternative field names that might be returned by the API
  api_key?: string
  token?: string
  secret?: string
  plan?: string
  subscription?: string
}

export type CreatedApiKeyResponse = {
  id: string
  key: string
  message: string
  name: string
}

// Oracle Engine specific types
export type OraclePrice = {
  id: string
  assetID: string
  value: number
  expo: number
  timestamp: string
  source: string
  req_hash: string
  req_url: string
  is_aggr: boolean
  connected_price_ids: string[]
  price_changes?: PriceChange[]
}

export type PriceChange = {
  period: string
  change: number
  change_pct: number
  from_price: number
  to_price: number
  from_time: string
  to_time: string
}

export type OracleAsset = {
  asset_id: string
  asset: string
}

export type SubscriptionPlan = {
  name: string
  price: number
  api_requests: number
  rate_limit_per_hour: number
  rate_limit_per_day: number
  data_access: string
  custom_pairs: number
  request_cost: number
  support: string
  historical_data: boolean
  private_data: boolean
}

export type SubscriptionPlansResponse = {
  plans: Record<string, SubscriptionPlan>
}

// Oracle Engine Status Types
export type SystemStatus = {
  overallStatus: string
  lastUpdated: string
  services: number
  uptime: string
}

export type ServiceStatus = {
  id: string
  name: string
  description: string
  status: 'operational' | 'degraded' | 'down'
  uptime: number
  responseTime: number
  icon: string
}

export type Incident = {
  id: number
  service: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'critical' | 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
}

export type UptimeStats = {
  last90Days: number
  last30Days: number
  last7Days: number
  last24Hours: number
}
