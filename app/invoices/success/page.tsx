"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, FileText, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function InvoiceSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { execute: executeApiCall } = useApiCall()
  const { user } = useAuth()
  
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending'>('pending')
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const invoiceId = searchParams.get('invoiceId')
  const userId = searchParams.get('userId')
  const amount = searchParams.get('amount')
  const paymentMethod = searchParams.get('paymentMethod')

  useEffect(() => {
    if (invoiceId && userId && amount) {
      verifyPayment()
    } else {
      setError('Missing required payment parameters')
      setVerificationStatus('error')
      setIsVerifying(false)
    }
  }, [invoiceId, userId, amount])

  const verifyPayment = async () => {
    try {
      setIsVerifying(true)
      setError(null)

      // Get the payment reference from localStorage (set by PaymentDialog)
      const paymentReference = localStorage.getItem('pending_payment_reference')
      
      if (!paymentReference) {
        throw new Error('Payment reference not found')
      }

      console.log('Verifying invoice payment:', {
        invoiceId,
        userId,
        amount,
        paymentReference
      })

      // Verify payment with Paystack
      const verifyResponse = await fetch('/api/payments/paystack/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: paymentReference,
          invoice_id: invoiceId,
          user_id: userId,
          amount: parseFloat(amount || '0'),
          payment_type: 'invoice'
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Payment verification failed')
      }

      const verifyData = await verifyResponse.json()
      console.log('Payment verification response:', verifyData)

      if (verifyData.status === 'success') {
        setVerificationStatus('success')
        
        // Get updated invoice data
        if (user) {
          try {
            const invoiceResponse = await executeApiCall(() => 
              apiService.getInvoiceById(user.id, invoiceId!)
            )
            if (invoiceResponse) {
              setInvoiceData(invoiceResponse)
            }
          } catch (err) {
            console.warn('Failed to fetch updated invoice data:', err)
          }
        }

        toast({
          title: "Payment Successful",
          description: `Invoice ${invoiceId} has been paid successfully!`,
        })

        // Clean up localStorage
        localStorage.removeItem('pending_payment_reference')
      } else {
        throw new Error('Payment verification failed')
      }
    } catch (err) {
      console.error('Payment verification error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed'
      setError(errorMessage)
      setVerificationStatus('error')
      
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const formatAmount = (amountInCents: number, currency: string) => {
    const amount = amountInCents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isVerifying) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Verifying Payment</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment with Paystack...
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="max-w-2xl mx-auto w-full">
          {verificationStatus === 'success' ? (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Payment Successful!</CardTitle>
                <CardDescription>
                  Your invoice has been paid successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {invoiceData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Invoice Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-700">Invoice Number:</span>
                        <div className="text-green-600">{invoiceData.invoice_number}</div>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Amount:</span>
                        <div className="text-green-600 font-bold">
                          {formatAmount(invoiceData.amount, invoiceData.currency)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Status:</span>
                        <div>
                          <Badge variant="default" className="bg-green-500">
                            Paid
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Paid On:</span>
                        <div className="text-green-600">
                          {invoiceData.paid_at ? formatDate(invoiceData.paid_at) : 'Just now'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => router.push('/invoices')}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View All Invoices
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-red-100 p-3">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Payment Verification Failed</CardTitle>
                <CardDescription>
                  There was an issue verifying your payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    If you completed the payment but see this error, please contact our support team.
                    Your payment may still be processing.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={() => router.push('/invoices')}
                      className="flex-1"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Invoices
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                      className="flex-1"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
