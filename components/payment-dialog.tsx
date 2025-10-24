"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  CreditCard,
  ExternalLink
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { exchangeRateAPI } from "@/lib/exchange-rate-api"

// Plan interface from plan page
interface Plan {
  id: string
  name: string
  price: number | string
  priceDescription?: string
  description: string
  features: {
    dataAccess: string
    apiRequests: string
    rateLimit: string
    requestCall: string
    support: string
  }
  popular?: boolean
  current?: boolean
  billingFrequency?: 'monthly' | 'annual'
  monthlyPrice?: number
  annualPrice?: number
}

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPlan: Plan | null
  onPaymentSuccess: () => void
  invoiceId?: string // Optional invoice ID for invoice payments
}

type PaymentStep = 'confirm' | 'processing' | 'success'

export function PaymentDialog({ open, onOpenChange, selectedPlan, onPaymentSuccess, invoiceId }: PaymentDialogProps) {
  const [step, setStep] = useState<PaymentStep>('confirm')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [ngnAmount, setNgnAmount] = useState<number | null>(null)
  
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Fetch exchange rate when component mounts or selectedPlan changes
  useEffect(() => {
    if (selectedPlan && Number(selectedPlan.price) > 0) {
      const fetchExchangeRate = async () => {
        try {
          const rate = await exchangeRateAPI.getUSDToNGNRate()
          const amount = Number(selectedPlan.price) * rate.rate
          setExchangeRate(rate.rate)
          setNgnAmount(amount)
        } catch (error) {
          console.error('Failed to fetch exchange rate:', error)
          // Fallback to hardcoded rate
          const fallbackRate = 1650
          const amount = Number(selectedPlan.price) * fallbackRate
          setExchangeRate(fallbackRate)
          setNgnAmount(amount)
        }
      }
      
      fetchExchangeRate()
    }
  }, [selectedPlan])

  const resetDialog = () => {
    setStep('confirm')
    setError(null)
    setIsLoading(false)
  }

  useEffect(() => {
    if (open) {
      resetDialog()
    }
  }, [open])

  const handlePayWithPaystack = async () => {
    if (!selectedPlan || !user) {
      console.error('Missing required data:', { selectedPlan, user })
      return
    }

    if (isLoading) {
      console.log('Payment already in progress, skipping...')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Initializing Paystack payment for:', {
        plan: selectedPlan.name,
        price: selectedPlan.price,
        user: user.email || user.id
      })
      // Create payment initialization request
      // Convert USD to NGN using dynamic exchange rate from IFA Labs API
      const amountInNGN = ngnAmount || await exchangeRateAPI.convertUSDToNGNCached(Number(selectedPlan.price));
      
      // Determine if this is an invoice payment or subscription payment
      const isInvoicePayment = !!invoiceId
      const reference = isInvoicePayment 
        ? `inv_${invoiceId}_${user.id}_${Date.now()}`
        : `sub_${selectedPlan.id}_${user.id}_${Date.now()}`
      
      const callbackUrl = isInvoicePayment
        ? `${window.location.origin}/invoices/success?invoiceId=${invoiceId}&userId=${user.id}&amount=${selectedPlan.price}&paymentMethod=paystack`
        : `${window.location.origin}/subscription/success?plan=${encodeURIComponent(selectedPlan.name)}&billing=${selectedPlan.billingFrequency || 'monthly'}&planId=${selectedPlan.id}&userId=${user.id}&amount=${selectedPlan.price}&paymentMethod=paystack`

      const paymentData = {
        email: user.email || `${user.id}@ifalabs.com`,
        amount: Math.round(amountInNGN * 100), // Convert to kobo (NGN smallest unit)
        currency: 'NGN', // Nigerian Naira - default for most Paystack accounts
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          user_id: user.id,
          billing_frequency: selectedPlan.billingFrequency || 'monthly',
          invoice_id: invoiceId, // Include invoice ID if this is an invoice payment
          payment_type: isInvoicePayment ? 'invoice' : 'subscription',
          custom_fields: [
            {
              display_name: isInvoicePayment ? "Invoice" : "Plan",
              variable_name: isInvoicePayment ? "invoice" : "plan",
              value: isInvoicePayment ? `Invoice ${invoiceId}` : selectedPlan.name
            }
          ]
        }
      }

      console.log('Payment data to be sent:', JSON.stringify(paymentData, null, 2))

      // Validate paymentData before sending
      if (!paymentData.email || !paymentData.amount || !paymentData.reference) {
        throw new Error('Invalid payment data: missing required fields')
      }

      const requestBody = JSON.stringify(paymentData)
      console.log('Request body length:', requestBody.length)

      // Call our API to initialize Paystack transaction
      const response = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: requestBody,
      })

      console.log('API response status:', response.status)
      console.log('API response ok:', response.ok)

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json()
        } catch (parseError) {
          const textError = await response.text()
          console.error('Failed to parse error response:', textError)
          throw new Error(`Payment initialization failed (${response.status}): ${textError || 'Unknown error'}`)
        }
        console.error('Payment initialization error:', errorData)
        throw new Error(errorData.error || errorData.message || 'Failed to initialize payment')
      }

      const data = await response.json()
      console.log('Payment initialization response:', data)
      
      // Redirect to Paystack checkout page
      if (data.authorization_url) {
        // Store payment reference and plan info
        localStorage.setItem('pending_payment_reference', data.reference)
        localStorage.setItem('pending_plan_id', selectedPlan.id)
        localStorage.setItem('pending_billing_frequency', selectedPlan.billingFrequency || 'monthly')
        
        // Redirect to Paystack
        window.location.href = data.authorization_url
      } else {
        throw new Error('No authorization URL received from Paystack')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      setError(errorMessage)
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (step !== 'processing') {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'confirm' && (invoiceId ? 'Pay Invoice' : 'Confirm Your Payment')}
            {step === 'processing' && 'Processing Payment'}
            {step === 'success' && 'Payment Successful!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'confirm' && (invoiceId ? 'Review your invoice details' : 'Review your subscription details')}
            {step === 'processing' && 'Please wait...'}
            {step === 'success' && (invoiceId ? 'Your invoice has been paid' : 'Your subscription has been activated')}
          </DialogDescription>
        </DialogHeader>

        {/* Confirmation Step */}
        {step === 'confirm' && selectedPlan && (
          <div className="space-y-6 py-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount (USD)</span>
                    <span className="font-bold text-lg">${selectedPlan.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount (NGN)</span>
                    <span className="font-bold text-lg">
                      ₦{ngnAmount ? ngnAmount.toLocaleString() : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <span className="font-medium">
                      {selectedPlan.billingFrequency === 'annual' ? 'Annual' : 'Monthly'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium">Paystack</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">Nigerian Naira (NGN)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription className="text-xs">
                You will be redirected to Paystack's secure checkout page to complete your payment.
                We accept cards, bank transfers, and mobile money. Payment will be processed in Nigerian Naira (NGN).
              </AlertDescription>
            </Alert>
            
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Exchange Rate:</strong> $1 USD = ₦{exchangeRate ? exchangeRate.toLocaleString() : '1,650'} NGN (live rate from IFA Labs API). 
                Paystack will show the exact amount in NGN at checkout.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handlePayWithPaystack} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Paystack...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Processing payment...</p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Please wait while we confirm your payment with Paystack
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {invoiceId 
                ? `Invoice ${invoiceId} has been paid successfully.`
                : `Your subscription to ${selectedPlan?.name} has been activated.`
              }
            </p>
            <Button onClick={() => {
              onPaymentSuccess()
              onOpenChange(false)
            }}>
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
