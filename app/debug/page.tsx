"use client"

import React from 'react'
import { AuthDebug } from '../../components/auth-debug'
import { OracleApiKeyManager } from '../../components/oracle-api-key-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useAuth } from '../../lib/auth-context'
import { apiService } from '../../lib/api'
import { useState } from 'react'

export default function DebugPage() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const runApiTests = async () => {
    setTesting(true)
    setTestResults(null)

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Health check
    try {
      const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.ifalabs.com'}/api/health`)
      results.tests.push({
        name: 'Health Check',
        status: healthResponse.ok ? 'success' : 'error',
        statusCode: healthResponse.status,
        response: healthResponse.ok ? 'OK' : await healthResponse.text()
      })
    } catch (error) {
      results.tests.push({
        name: 'Health Check',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: Profile API (if user is authenticated)
    if (user?.id) {
      try {
        const profileResponse = await apiService.getCompanyProfile(user.id)
        results.tests.push({
          name: 'Get Profile',
          status: 'success',
          data: profileResponse.data
        })
      } catch (error) {
        results.tests.push({
          name: 'Get Profile',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Test 3: API Keys
      try {
        const keysResponse = await apiService.getProfileApiKeys(user.id)
        results.tests.push({
          name: 'Get API Keys',
          status: 'success',
          data: keysResponse.data
        })
      } catch (error) {
        results.tests.push({
          name: 'Get API Keys',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } else {
      results.tests.push({
        name: 'Profile/API Keys Tests',
        status: 'skipped',
        reason: 'No user ID available'
      })
    }

    // Test 4: Oracle Engine endpoints
    try {
      const assetsResponse = await apiService.getAssets()
      results.tests.push({
        name: 'Get Assets',
        status: 'success',
        data: assetsResponse.data
      })
    } catch (error) {
      results.tests.push({
        name: 'Get Assets',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    setTestResults(results)
    setTesting(false)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Debug Dashboard</h1>
        <p className="text-muted-foreground">
          Debug and troubleshoot your Oracle Engine integration
        </p>
      </div>

      <div className="grid gap-8">
        <AuthDebug />
        
        <Card>
          <CardHeader>
            <CardTitle>API Tests</CardTitle>
            <CardDescription>
              Test various API endpoints to identify issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runApiTests} disabled={testing}>
              {testing ? 'Running Tests...' : 'Run API Tests'}
            </Button>

            {testResults && (
              <div className="space-y-4">
                <h3 className="font-semibold">Test Results</h3>
                <div className="space-y-2">
                  {testResults.tests.map((test: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Badge variant={
                        test.status === 'success' ? 'default' :
                        test.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {test.status}
                      </Badge>
                      <span className="font-medium">{test.name}</span>
                      {test.statusCode && (
                        <span className="text-sm text-muted-foreground">
                          ({test.statusCode})
                        </span>
                      )}
                      {test.error && (
                        <span className="text-sm text-red-600">
                          {test.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <OracleApiKeyManager />
      </div>
    </div>
  )
}
