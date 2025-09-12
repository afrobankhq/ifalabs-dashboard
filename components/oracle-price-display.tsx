"use client"

import React, { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { useOracleEngine } from '../hooks/use-oracle-engine'
import { OraclePrice, OracleAsset } from '../lib/api'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Play, Square } from 'lucide-react'

interface OraclePriceDisplayProps {
  className?: string
}

export function OraclePriceDisplay({ className }: OraclePriceDisplayProps) {
  const {
    prices,
    assets,
    isLoading,
    error,
    hasApiKey,
    refreshPrices,
    refreshAssets,
    startPriceStream,
    stopPriceStream,
    formatPrice,
    getPriceChange
  } = useOracleEngine()

  const [isStreaming, setIsStreaming] = React.useState(false)

  useEffect(() => {
    if (hasApiKey && !prices && !isLoading) {
      refreshPrices()
    }
  }, [hasApiKey, prices, isLoading, refreshPrices])

  const handleStartStream = () => {
    const stream = startPriceStream()
    if (stream) {
      setIsStreaming(true)
    }
  }

  const handleStopStream = () => {
    stopPriceStream()
    setIsStreaming(false)
  }

  const getPriceChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-4 w-4" />
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4" />
  }

  const getPriceChangeColor = (change: number | null) => {
    if (change === null) return 'secondary'
    if (change > 0) return 'default'
    if (change < 0) return 'destructive'
    return 'secondary'
  }

  if (!hasApiKey) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Oracle Engine Prices</CardTitle>
          <CardDescription>Configure your API key to view real-time price data</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please configure your Oracle Engine API key to view price data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Oracle Engine Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refreshPrices} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Oracle Engine Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading prices...
          </div>
        </CardContent>
      </Card>
    )
  }

  const priceEntries = prices ? Object.entries(prices) : []

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Oracle Engine Prices</CardTitle>
            <CardDescription>
              Real-time price data from Oracle Engine
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPrices}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {!isStreaming ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartStream}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Stream
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopStream}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Stream
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {priceEntries.length === 0 ? (
          <Alert>
            <AlertDescription>
              No price data available. Make sure your API key has access to price endpoints.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {priceEntries.map(([assetId, price]) => {
              const change24h = getPriceChange(price, '24h')
              const change7d = getPriceChange(price, '7d')
              
              return (
                <div
                  key={assetId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{assetId}</h3>
                      <Badge variant="outline">{price.source}</Badge>
                      {price.is_aggr && (
                        <Badge variant="secondary">Aggregated</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(price.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatPrice(price)}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {change24h !== null && (
                        <Badge variant={getPriceChangeColor(change24h)}>
                          {getPriceChangeIcon(change24h)}
                          <span className="ml-1">
                            {change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%
                          </span>
                        </Badge>
                      )}
                      {change7d !== null && (
                        <Badge variant="outline">
                          {getPriceChangeIcon(change7d)}
                          <span className="ml-1">
                            {change7d > 0 ? '+' : ''}{change7d.toFixed(2)}%
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
