// API service layer for communicating with the backend
// Route through local proxy by default to avoid CORS and simplify paths
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined' ? '/api/proxy' : 'https://api.ifalabs.com')

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new ApiError(
          data.message || 'An error occurred',
          response.status,
          data
        )
      }

      return {
        data,
        status: response.status,
        message: data.message,
      }
    } catch (error) {
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
    const template = process.env.NEXT_PUBLIC_COMPANY_PROFILE_PATH
    if (!template) {
      throw new ApiError(
        'Company profile path is not configured. Set NEXT_PUBLIC_COMPANY_PROFILE_PATH (e.g., /api/dashboard/profile/{id}).',
        404
      )
    }
    const path = template
      .replace('{id}', encodeURIComponent(id))
      .replace(':id', encodeURIComponent(id))
    return this.request<CompanyProfile>(path)
  }

  // Profile API keys
  async getProfileApiKeys(id: string) {
    const template = process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH
    if (!template) {
      throw new ApiError(
        'Profile API keys path is not configured. Set NEXT_PUBLIC_PROFILE_KEYS_PATH (e.g., /api/dashboard/profiles/{id}/keys).',
        404
      )
    }
    const path = template
      .replace('{id}', encodeURIComponent(id))
      .replace(':id', encodeURIComponent(id))
    return this.request<ApiKey[]>(path)
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
    let lastError: unknown = null
    for (const ep of endpoints) {
      try {
        return await this.request<T>(ep, options)
      } catch (err) {
        lastError = err
      }
    }
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

  // API Keys endpoints
  async getApiKeys() {
    return this.request('/api/keys')
  }

  async createApiKey(keyData: { name: string; environment: string }) {
    return this.request('/api/keys', {
      method: 'POST',
      body: JSON.stringify(keyData),
    })
  }

  async deleteApiKey(keyId: string) {
    return this.request(`/api/keys/${keyId}`, {
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

  async changePassword(passwordData: {
    currentPassword: string
    newPassword: string
  }) {
    return this.request('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
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

  // Status endpoints
  async getSystemStatus() {
    return this.request('/api/status')
  }

  async getServiceStatus() {
    return this.request('/api/status/services')
  }

  async getIncidents() {
    return this.request('/api/status/incidents')
  }

  async getUptimeStats() {
    return this.request('/api/status/uptime')
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
}
