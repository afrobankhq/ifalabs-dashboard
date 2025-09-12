"use client"

import React from 'react'
import { OracleApiKeyManager } from '../../components/oracle-api-key-manager'
import { OraclePriceDisplay } from '../../components/oracle-price-display'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'

export default function OracleDemoPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Oracle Engine Integration Demo</h1>
        <p className="text-muted-foreground">
          Test the integration with your Oracle Engine API
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <OracleApiKeyManager />
        <OraclePriceDisplay />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            This demo shows how to integrate with the Oracle Engine API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• API Key Management</li>
                <li>• Real-time Price Data</li>
                <li>• Price Streaming (SSE)</li>
                <li>• Error Handling</li>
                <li>• TypeScript Integration</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Oracle Engine Endpoints:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>/api/prices/last</code> - Latest prices</li>
                <li>• <code>/api/prices/stream</code> - Real-time stream</li>
                <li>• <code>/api/assets</code> - Available assets</li>
                <li>• <code>/api/subscription/plans</code> - Plans</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
