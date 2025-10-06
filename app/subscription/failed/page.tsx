"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { XCircle, ArrowRight, Loader2, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"

interface PaymentFailedData {
  planName?: string
  paymentId?: string
  amount?: number
  currency?: string
  errorCode?: string
  errorMessage?: string
  transactionHash?: string
}

function PaymentFailedContent() {
  const [paymentData, setPaymentData] = useState<PaymentFailedData | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Extract payment data from URL parameters
    const planName = searchParams.get('plan')
    const paymentId = searchParams.get('payment_id')
    const amount = searchParams.get('amount')
    const currency = searchParams.get('currency')
    const errorCode = searchParams.get('error_code')
    const errorMessage = searchParams.get('error_message')
    const transactionHash = searchParams.get('tx_hash')

    setPaymentData({
      planName: planName ? decodeURIComponent(planName) : undefined,
      paymentId: paymentId || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      currency: currency || 'USD',
      errorCode: errorCode || undefined,
      errorMessage: errorMessage || undefined,
      transactionHash: transactionHash || undefined,
    })

    // Show error toast
    toast({
      title: "Payment Failed",
      description: "Your payment could not be processed. Please try again or contact support.",
      variant: "destructive",
    })
  }, [searchParams, toast])

  const handleRetryPayment = () => {
    if (paymentData?.planName) {
      router.push(`/plan?retry=${encodeURIComponent(paymentData.planName)}`)
    } else {
      router.push('/plan')
    }
  }

  const handleContactSupport = () => {
    // You can implement support contact logic here
    toast({
      title: "Contact Support",
      description: "Please email support@yourcompany.com with your payment details.",
    })
  }

  const handleBackToPlans = () => {
    router.push('/plan')
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const getErrorMessage = () => {
    if (paymentData?.errorMessage) {
      return paymentData.errorMessage
    }
    
    if (paymentData?.errorCode) {
      switch (paymentData.errorCode) {
        case 'insufficient_funds':
          return 'Insufficient funds in your wallet'
        case 'network_error':
          return 'Network error occurred during payment'
        case 'timeout':
          return 'Payment timed out'
        case 'invalid_address':
          return 'Invalid payment address'
        case 'cancelled':
          return 'Payment was cancelled by user'
        default:
          return 'An unknown error occurred'
      }
    }
    
    return 'Payment could not be processed'
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto">
        {/* Failure Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
              Payment Failed
            </h1>
            <p className="text-muted-foreground mt-2">
              We're sorry, but your payment could not be processed at this time.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {getErrorMessage()}
          </AlertDescription>
        </Alert>

        {/* Payment Details */}
        {paymentData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Payment Details
              </CardTitle>
              <CardDescription>Details of the failed payment attempt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {paymentData.planName && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Plan</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {paymentData.planName}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {paymentData.amount && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-sm font-medium">
                      ${paymentData.amount.toFixed(2)} {paymentData.currency}
                    </p>
                  </div>
                )}
                
                {paymentData.paymentId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {paymentData.paymentId}
                    </p>
                  </div>
                )}
                
                {paymentData.errorCode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Error Code</label>
                    <p className="text-sm font-mono bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 px-2 py-1 rounded">
                      {paymentData.errorCode}
                    </p>
                  </div>
                )}
                
                {paymentData.transactionHash && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                        {paymentData.transactionHash}
                      </p>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`https://blockchain.info/tx/${paymentData.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>What can you do?</CardTitle>
            <CardDescription>Here are some steps to resolve this issue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Try the payment again</p>
                  <p className="text-xs text-muted-foreground">Sometimes payments fail due to temporary issues</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Check your wallet balance</p>
                  <p className="text-xs text-muted-foreground">Ensure you have sufficient funds for the payment</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Contact support</p>
                  <p className="text-xs text-muted-foreground">Our team can help resolve payment issues</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleRetryPayment} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={handleContactSupport}>
            Contact Support
          </Button>
          <Button variant="outline" onClick={handleBackToPlans}>
            Back to Plans
          </Button>
        </div>

        {/* Additional Help */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Need immediate help?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  If you continue to experience issues, please contact our support team with your payment ID and we'll help resolve this quickly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  )
}

