import { useState, useEffect, useCallback } from 'react'
import { oracleEngineService } from '../lib/oracle-engine'
import { OraclePrice, OracleAsset, SubscriptionPlansResponse } from '../lib/api'

export interface UseOracleEngineReturn {
  // State
  prices: Record<string, OraclePrice> | null
  assets: OracleAsset[] | null
  subscriptionPlans: SubscriptionPlansResponse | null
  isLoading: boolean
  error: string | null
  hasApiKey: boolean

  // Actions
  setApiKey: (apiKey: string) => void
  removeApiKey: () => void
  refreshPrices: () => Promise<void>
  refreshAssets: () => Promise<void>
  refreshSubscriptionPlans: () => Promise<void>
  startPriceStream: () => EventSource | null
  stopPriceStream: () => void

  // Utilities
  formatPrice: (price: OraclePrice) => string
  getPriceChange: (price: OraclePrice, period?: string) => number | null
}

export function useOracleEngine(): UseOracleEngineReturn {
  const [prices, setPrices] = useState<Record<string, OraclePrice> | null>(null)
  const [assets, setAssets] = useState<OracleAsset[] | null>(null)
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlansResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [priceStream, setPriceStream] = useState<EventSource | null>(null)

  // Check API key status
  useEffect(() => {
    setHasApiKey(oracleEngineService.hasApiKey())
  }, [])

  // Load initial data
  useEffect(() => {
    if (hasApiKey) {
      loadInitialData()
    }
  }, [hasApiKey])

  const loadInitialData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await Promise.all([
        refreshPrices(),
        refreshAssets(),
        refreshSubscriptionPlans()
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshPrices = useCallback(async () => {
    try {
      const priceData = await oracleEngineService.getLastPrice()
      if (priceData) {
        setPrices(priceData as Record<string, OraclePrice>)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
    }
  }, [])

  const refreshAssets = useCallback(async () => {
    try {
      const assetData = await oracleEngineService.getAssets()
      if (assetData) {
        setAssets(assetData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets')
    }
  }, [])

  const refreshSubscriptionPlans = useCallback(async () => {
    try {
      const plansData = await oracleEngineService.getSubscriptionPlans()
      if (plansData) {
        setSubscriptionPlans(plansData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription plans')
    }
  }, [])

  const setApiKey = useCallback((apiKey: string) => {
    oracleEngineService.setApiKey(apiKey)
    setHasApiKey(true)
    setError(null)
  }, [])

  const removeApiKey = useCallback(() => {
    oracleEngineService.removeApiKey()
    setHasApiKey(false)
    setPrices(null)
    setAssets(null)
    setSubscriptionPlans(null)
    stopPriceStream()
  }, [])

  const startPriceStream = useCallback(() => {
    if (!hasApiKey) {
      setError('API key required for price streaming')
      return null
    }

    const stream = oracleEngineService.createPriceStream()
    if (stream) {
      setPriceStream(stream)

      stream.onmessage = (event) => {
        try {
          const priceUpdate = JSON.parse(event.data)
          setPrices(prev => ({
            ...prev,
            [priceUpdate.assetID]: priceUpdate
          }))
        } catch (err) {
          console.error('Failed to parse price update:', err)
        }
      }

      stream.onerror = (err) => {
        console.error('Price stream error:', err)
        setError('Price stream connection failed')
        setPriceStream(null)
      }
    }

    return stream
  }, [hasApiKey])

  const stopPriceStream = useCallback(() => {
    if (priceStream) {
      priceStream.close()
      setPriceStream(null)
    }
  }, [priceStream])

  const formatPrice = useCallback((price: OraclePrice) => {
    return oracleEngineService.formatPrice(price)
  }, [])

  const getPriceChange = useCallback((price: OraclePrice, period: string = '24h') => {
    return oracleEngineService.getPriceChangePercentage(price, period)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPriceStream()
    }
  }, [stopPriceStream])

  return {
    // State
    prices,
    assets,
    subscriptionPlans,
    isLoading,
    error,
    hasApiKey,

    // Actions
    setApiKey,
    removeApiKey,
    refreshPrices,
    refreshAssets,
    refreshSubscriptionPlans,
    startPriceStream,
    stopPriceStream,

    // Utilities
    formatPrice,
    getPriceChange
  }
}
