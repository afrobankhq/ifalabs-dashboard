// Oracle Engine specific service for price data and API management
import { apiService, OraclePrice, OracleAsset, SubscriptionPlansResponse } from './api'

export class OracleEngineService {
  private apiKey: string | null = null

  constructor() {
    this.loadApiKey()
  }

  private loadApiKey(): void {
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('oracle_api_key')
    }
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    if (typeof window !== 'undefined') {
      localStorage.setItem('oracle_api_key', apiKey)
    }
    // Also set it in the main API service
    apiService.setApiKey(apiKey)
  }

  public removeApiKey(): void {
    this.apiKey = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oracle_api_key')
    }
    apiService.removeApiKey()
  }

  public hasApiKey(): boolean {
    return !!this.apiKey
  }

  // Price data methods
  async getLastPrice(assetId?: string): Promise<OraclePrice | Record<string, OraclePrice> | null> {
    try {
      const response = await apiService.getLastPrice(assetId)
      return response.data
    } catch (error) {
      console.error('Failed to fetch last price:', error)
      return null
    }
  }

  async getAssets(): Promise<OracleAsset[] | null> {
    try {
      const response = await apiService.getAssets()
      return response.data
    } catch (error) {
      console.error('Failed to fetch assets:', error)
      return null
    }
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlansResponse | null> {
    try {
      const response = await apiService.getSubscriptionPlans()
      return response.data
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error)
      return null
    }
  }

  // Create EventSource for real-time price streaming
  createPriceStream(): EventSource | null {
    if (!this.apiKey) {
      console.error('API key required for price streaming')
      return null
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ifalabs.com'
    const streamUrl = `${baseUrl}/api/prices/stream`
    
    try {
      const eventSource = new EventSource(streamUrl, {
        headers: {
          'X-API-Key': this.apiKey
        }
      } as any) // TypeScript doesn't support headers in EventSource constructor

      return eventSource
    } catch (error) {
      console.error('Failed to create price stream:', error)
      return null
    }
  }

  // Utility method to format price data
  formatPrice(price: OraclePrice): string {
    const value = price.value * Math.pow(10, price.expo)
    return value.toFixed(6)
  }

  // Utility method to get price change percentage
  getPriceChangePercentage(price: OraclePrice, period: string = '24h'): number | null {
    if (!price.price_changes) return null
    
    const change = price.price_changes.find(c => c.period === period)
    return change ? change.change_pct : null
  }
}

// Create singleton instance
export const oracleEngineService = new OracleEngineService()
