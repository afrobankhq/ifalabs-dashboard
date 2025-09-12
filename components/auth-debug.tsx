"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useAuth } from '../lib/auth-context'
import { tokenService } from '../lib/token-service'

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    setToken(tokenService.getToken())
  }, [])

  const handleClearAuth = () => {
    tokenService.removeToken()
    setToken(null)
    window.location.reload()
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Authentication Debug</CardTitle>
        <CardDescription>
          Debug information for authentication and API integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-2">Auth Status</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Loading:</span>
                <Badge variant={isLoading ? "default" : "secondary"}>
                  {isLoading ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Authenticated:</span>
                <Badge variant={isAuthenticated ? "default" : "secondary"}>
                  {isAuthenticated ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Has Token:</span>
                <Badge variant={token ? "default" : "secondary"}>
                  {token ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">User Info</h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">ID:</span> {user?.id || "None"}
              </div>
              <div className="text-sm">
                <span className="font-medium">Name:</span> {user?.name || "None"}
              </div>
              <div className="text-sm">
                <span className="font-medium">Email:</span> {user?.email || "None"}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Environment Variables</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">API URL:</span> {process.env.NEXT_PUBLIC_API_URL || "Not set"}
            </div>
            <div>
              <span className="font-medium">Login Path:</span> {process.env.NEXT_PUBLIC_AUTH_LOGIN_PATH || "Not set"}
            </div>
            <div>
              <span className="font-medium">Verify Path:</span> {process.env.NEXT_PUBLIC_AUTH_VERIFY_PATH || "Not set"}
            </div>
            <div>
              <span className="font-medium">Profile Keys Path:</span> {process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH || "Not set"}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Token Info</h3>
          <div className="text-sm">
            <span className="font-medium">Token:</span> {token ? `${token.substring(0, 20)}...` : "None"}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearAuth}>
            Clear Auth & Reload
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>If you're having issues:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Make sure you have a valid .env.local file</li>
            <li>Check that the Oracle Engine API is accessible</li>
            <li>Verify your login credentials</li>
            <li>Check the browser console for detailed error messages</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
