// Exchange rate API service for fetching dynamic rates from IFA Labs API
export interface ExchangeRateResponse {
  rate: number
  from: string
  to: string
  timestamp: string
  source: string
}

export class ExchangeRateAPI {
  private baseUrl: string

  constructor(baseUrl: string = '/api/proxy') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetches the current USD to NGN exchange rate
   */
  async getUSDToNGNRate(): Promise<ExchangeRateResponse> {
    try {
      const url = `${this.baseUrl}/api/exchange-rates/usd-ngn`
      console.log('Fetching exchange rate from:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Exchange rate response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Exchange rate API error response:', errorText)
        throw new Error(`Failed to fetch exchange rate: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Exchange rate data received:', data)
      return data
    } catch (error) {
      console.error('Error fetching USD to NGN rate:', error)
      throw error
    }
  }

  /**
   * Fetches exchange rate for any supported currency pair
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRateResponse> {
    try {
      const params = new URLSearchParams({ from, to })
      const response = await fetch(`${this.baseUrl}/api/exchange-rates?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error fetching ${from} to ${to} rate:`, error)
      throw error
    }
  }

  /**
   * Converts USD amount to NGN using current exchange rate
   */
  async convertUSDToNGN(usdAmount: number): Promise<number> {
    try {
      const rate = await this.getUSDToNGNRate()
      return usdAmount * rate.rate
    } catch (error) {
      console.error('Error converting USD to NGN:', error)
      // Fallback to hardcoded rate if API fails
      const fallbackRate = 1650
      console.warn(`Using fallback rate: ${fallbackRate}`)
      return usdAmount * fallbackRate
    }
  }

  /**
   * Converts USD amount to NGN with caching to avoid multiple API calls
   */
  private rateCache: { rate: number; timestamp: number } | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async convertUSDToNGNCached(usdAmount: number): Promise<number> {
    const now = Date.now()
    
    // Check if we have a valid cached rate
    if (this.rateCache && (now - this.rateCache.timestamp) < this.CACHE_DURATION) {
      console.log('Using cached exchange rate:', this.rateCache.rate)
      return usdAmount * this.rateCache.rate
    }

    try {
      const rate = await this.getUSDToNGNRate()
      
      // Cache the rate
      this.rateCache = {
        rate: rate.rate,
        timestamp: now
      }
      
      return usdAmount * rate.rate
    } catch (error) {
      console.error('Error fetching exchange rate, using fallback:', error)
      
      // Use cached rate if available, otherwise fallback
      if (this.rateCache) {
        console.log('Using cached rate as fallback:', this.rateCache.rate)
        return usdAmount * this.rateCache.rate
      }
      
      const fallbackRate = 1650
      console.warn(`Using hardcoded fallback rate: ${fallbackRate}`)
      return usdAmount * fallbackRate
    }
  }
}

// Create a singleton instance
export const exchangeRateAPI = new ExchangeRateAPI()
