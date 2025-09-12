"use client"

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { useOracleEngine } from '../hooks/use-oracle-engine'
import { Eye, EyeOff, Key, CheckCircle, XCircle } from 'lucide-react'

interface OracleApiKeyManagerProps {
  className?: string
}

export function OracleApiKeyManager({ className }: OracleApiKeyManagerProps) {
  const { hasApiKey, setApiKey, removeApiKey, error } = useOracleEngine()
  const [apiKey, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) return

    setIsLoading(true)
    try {
      setApiKey(apiKey.trim())
      setApiKeyInput('')
      // You could add a test API call here to validate the key
    } catch (err) {
      console.error('Failed to set API key:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveApiKey = () => {
    removeApiKey()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Oracle Engine API Key
        </CardTitle>
        <CardDescription>
          Configure your API key to access Oracle Engine price data and features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasApiKey ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                API key is configured and ready to use.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveApiKey}
                className="ml-auto"
              >
                Remove API Key
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter your Oracle Engine API key"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSetApiKey}
              disabled={!apiKey.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? 'Setting...' : 'Set API Key'}
            </Button>

            <div className="text-xs text-muted-foreground">
              <p>You can get your API key from the Oracle Engine dashboard.</p>
              <p>Visit: <a href="https://api.ifalabs.com/swagger/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Oracle Engine API Documentation</a></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
