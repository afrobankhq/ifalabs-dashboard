"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, ArrowRight, Loader2, AlertCircle, RefreshCw, ExternalLink, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"

interface PartialPaymentData {
  planName?: string
  paymentId?: string
  amount?: number
  currency?: string
  paidAmount?: number
  remainingAmount?: number
  transactionHash?: string
  confirmations?: number
  requiredConfirmations?: number
}

function PartialPaymentContent() {
  const [paymentData, setPaymentData] = useState<PartialPaymentData | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Extract payment data from URL parameters
    const planName = searchParams.get('plan')
    const paymentId = searchParams.get('payment_id')
    const amount = searchParams.get('amount')
    const currency = searchParams.get('currency')
    const paidAmount = searchParams.get('paid_amount')
    const remainingAmount = searchParams.get('remaining_amount')
    const transactionHash = searchParams.get('tx_hash')
    const confirmations = searchParams.get('confirmations')
    const requiredConfirmations = searchParams.get('required_confirmations')

    setPaymentData({
      planName: planName ? decodeURIComponent(planName) : undefined,
      paymentId: paymentId || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      currency: currency || 'USD',
      paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
      remainingAmount: remainingAmount ? parseFloat(remainingAmount) : undefined,
      transactionHash: transactionHash || undefined,
      confirmations: confirmations ? parseInt(confirmations) : undefined,
      requiredConfirmations: requiredConfirmations ? parseInt(requiredConfirmations) : undefined,
    })

    // Show info toast
    toast({
      title: "Payment Processing",
      description: "Your payment is being processed. Please wait for confirmation.",
    })
  }, [searchParams, toast])

  const handleCheckStatus = async () => {
    if (!paymentData?.paymentId) return

    setIsCheckingStatus(true)
    
    try {
      // Simulate checking payment status
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Status Updated",
        description: "Payment status has been refreshed.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check payment status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleCompletePayment = () => {
    if (paymentData?.planName) {
      router.push(`/plan?complete=${encodeURIComponent(paymentData.planName)}`)
    } else {
      router.push('/plan')
    }
  }

  const handleBackToPlans = () => {
    router.push('/plan')
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const getPaymentProgress = () => {
    if (!paymentData?.amount || !paymentData?.paidAmount) return 0
    return (paymentData.paidAmount / paymentData.amount) * 100
  }

  const getConfirmationProgress = () => {
    if (!paymentData?.confirmations || !paymentData?.requiredConfirmations) return 0
    return (paymentData.confirmations / paymentData.requiredConfirmations) * 100
  }

  const isPaymentComplete = () => {
    return paymentData?.paidAmount && paymentData?.amount && 
           paymentData.paidAmount >= paymentData.amount
  }

  const isFullyConfirmed = () => {
    return paymentData?.confirmations && paymentData?.requiredConfirmations &&
           paymentData.confirmations >= paymentData.requiredConfirmations
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto">
        {/* Partial Payment Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Clock className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">
              Payment Processing
            </h1>
            <p className="text-muted-foreground mt-2">
              Your payment is being processed. Please wait for blockchain confirmation.
            </p>
          </div>
        </div>

        {/* Status Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isPaymentComplete() && isFullyConfirmed() 
              ? "Payment is complete and confirmed! Your subscription will be activated shortly."
              : isPaymentComplete() 
                ? "Payment amount received! Waiting for blockchain confirmation."
                : "Partial payment received. Please complete the remaining amount."
            }
          </AlertDescription>
        </Alert>

        {/* Payment Details */}
        {paymentData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Payment Status
              </CardTitle>
              <CardDescription>Current status of your payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Progress */}
              {paymentData.amount && paymentData.paidAmount && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Payment Progress</span>
                    <span>{paymentData.paidAmount.toFixed(2)} / {paymentData.amount.toFixed(2)} {paymentData.currency}</span>
                  </div>
                  <Progress value={getPaymentProgress()} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{getPaymentProgress().toFixed(1)}% Complete</span>
                    {paymentData.remainingAmount && paymentData.remainingAmount > 0 && (
                      <span>Remaining: ${paymentData.remainingAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation Progress */}
              {paymentData.confirmations && paymentData.requiredConfirmations && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Blockchain Confirmations</span>
                    <span>{paymentData.confirmations} / {paymentData.requiredConfirmations}</span>
                  </div>
                  <Progress value={getConfirmationProgress()} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{getConfirmationProgress().toFixed(1)}% Confirmed</span>
                    <span>{paymentData.requiredConfirmations - paymentData.confirmations} confirmations remaining</span>
                  </div>
                </div>
              )}

              {/* Payment Details Grid */}
              <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
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
                
                {paymentData.paymentId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {paymentData.paymentId}
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

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle>What's happening?</CardTitle>
            <CardDescription>Understanding the payment process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Blockchain Processing</p>
                  <p className="text-xs text-muted-foreground">Your payment is being verified on the blockchain</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Confirmation Required</p>
                  <p className="text-xs text-muted-foreground">Multiple confirmations ensure payment security</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Automatic Activation</p>
                  <p className="text-xs text-muted-foreground">Your subscription will activate once confirmed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleCheckStatus} 
            disabled={isCheckingStatus}
            className="flex-1"
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Status
              </>
            )}
          </Button>
          
          {!isPaymentComplete() && (
            <Button variant="outline" onClick={handleCompletePayment}>
              Complete Payment
            </Button>
          )}
          
          <Button variant="outline" onClick={handleBackToPlans}>
            Back to Plans
          </Button>
        </div>

        {/* Additional Information */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Processing Time
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Cryptocurrency payments typically take 10-30 minutes to confirm. You'll receive an email notification once your subscription is activated.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

export default function PartialPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-6 p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    }>
      <PartialPaymentContent />
    </Suspense>
  )
}

