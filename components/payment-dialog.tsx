"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  QrCode as QrCodeIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  paymentApiService, 
  formatCurrency, 
  getPaymentStatusColor, 
  getPaymentStatusText,
  PaymentStatusPoller
} from "@/lib/payments"
import { 
  PaymentDialogStep, 
  PaymentStatusType, 
  PaymentResponse,
  PaymentStatus
} from "@/types/payments"

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
import QRCode from "qrcode"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPlan: Plan | null
  onPaymentSuccess: () => void
}

const SUPPORTED_CURRENCIES = [
  { code: 'btc', name: 'Bitcoin', symbol: '₿' },
  { code: 'eth', name: 'Ethereum', symbol: 'Ξ' },
  { code: 'usdt', name: 'Tether (USDT)', symbol: '₮' },
  { code: 'usdc', name: 'USD Coin', symbol: '$' },
  { code: 'ltc', name: 'Litecoin', symbol: 'Ł' },
  { code: 'ada', name: 'Cardano', symbol: '₳' },
  { code: 'matic', name: 'Polygon', symbol: 'Ⓜ' },
  { code: 'bnb', name: 'BNB', symbol: 'Ⓑ' },
]

export function PaymentDialog({ open, onOpenChange, selectedPlan, onPaymentSuccess }: PaymentDialogProps) {
  const [step, setStep] = useState<PaymentDialogStep>('select')
  const [selectedCurrency, setSelectedCurrency] = useState('btc')
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([])
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [qrCode, setQRCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusPoller, setStatusPoller] = useState<PaymentStatusPoller | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  
  const { toast } = useToast()

  useEffect(() => {
    if (open && step === 'select') {
      loadSupportedCurrencies()
      resetDialog()
    }
  }, [open])

  useEffect(() => {
    // Cleanup poller on unmount or dialog close
    return () => {
      if (statusPoller) {
        statusPoller.stop()
      }
    }
  }, [statusPoller])

  // Timer for payment expiration
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (step === 'payment' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Payment expired
            setError('Payment time expired. Please create a new payment.')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [step, timeRemaining])

  const resetDialog = () => {
    setStep('select')
    setPaymentData(null)
    setPaymentStatus(null)
    setQRCode('')
    setError(null)
    setTimeRemaining(0)
    if (statusPoller) {
      statusPoller.stop()
      setStatusPoller(null)
    }
  }

  const loadSupportedCurrencies = async () => {
    try {
      const data = await paymentApiService.getSupportedCurrencies()
      setSupportedCurrencies(data.currencies || [])
      
      // Set default currency to first available
      const availableCurrency = SUPPORTED_CURRENCIES.find(curr => 
        data.currencies.includes(curr.code)
      )
      if (availableCurrency) {
        setSelectedCurrency(availableCurrency.code)
      }
    } catch (error) {
      console.error('Failed to load supported currencies:', error)
      // Use default currencies if API fails
      setSupportedCurrencies(SUPPORTED_CURRENCIES.map(c => c.code))
    }
  }

  const handleCreatePayment = async () => {
    if (!selectedPlan || !selectedCurrency) return

    setIsLoading(true)
    setError(null)
    
    try {
      // Create payment intent
      const paymentIntent = await paymentApiService.createPaymentIntent(
        selectedPlan.id,
        'crypto',
        selectedPlan.billingFrequency || 'monthly'
      )

      // Create NOWPayments payment
      const paymentRequest = {
        price_amount: Number(selectedPlan.price),
        price_currency: 'USD',
        pay_currency: selectedCurrency,
        order_id: paymentIntent.order_id,
        order_description: `Subscription upgrade to ${selectedPlan.name}`,
        ipn_callback_url: `${window.location.origin}/api/payments/webhook`,
        success_url: `${window.location.origin}/subscription/success?plan=${encodeURIComponent(selectedPlan.name)}&billing=${selectedPlan.billingFrequency || 'monthly'}`,
        cancel_url: `${window.location.origin}/subscription/plans`,
      }

      const payment = await paymentApiService.createNOWPayment(paymentRequest)
      setPaymentData(payment)
      
      // Generate QR code for the payment address
      const qrCodeUrl = await QRCode.toDataURL(payment.pay_address, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      setQRCode(qrCodeUrl)
      
      // Set payment expiration timer (15 minutes)
      setTimeRemaining(15 * 60)
      
      setStep('payment')
      
      // Start polling for payment status
      startStatusPolling(payment.payment_id)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment'
      setError(errorMessage)
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startStatusPolling = (paymentId: string) => {
    const poller = new PaymentStatusPoller({
      paymentId,
      onStatusChange: (status: PaymentStatus) => {
        setPaymentStatus(status)
        
        // Update UI based on status
        if (status.payment_status === 'confirming') {
          toast({
            title: "Payment Detected",
            description: "Your payment is being confirmed on the blockchain.",
          })
        }
      },
      onComplete: (status: PaymentStatus) => {
        setPaymentStatus(status)
        
        if (status.payment_status === 'confirmed' || status.payment_status === 'finished') {
          setStep('confirmation')
          toast({
            title: "Payment Successful!",
            description: `Your subscription has been upgraded to ${selectedPlan?.name}.`,
          })
          onPaymentSuccess()
        } else if (status.payment_status === 'failed' || status.payment_status === 'expired') {
          setError(`Payment ${status.payment_status}. Please try again.`)
          toast({
            title: "Payment Failed",
            description: `Payment ${status.payment_status}. Please create a new payment.`,
            variant: "destructive",
          })
        }
      },
      onError: (error: Error) => {
        console.error('Payment status polling error:', error)
        setError('Failed to check payment status. Please refresh the page.')
      },
      pollInterval: 5000, // 5 seconds
      maxAttempts: 180, // 15 minutes
    })

    poller.start()
    setStatusPoller(poller)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCurrencyInfo = (code: string) => {
    return SUPPORTED_CURRENCIES.find(curr => curr.code === code) || {
      code,
      name: code.toUpperCase(),
      symbol: code.toUpperCase(),
    }
  }

  const availableCurrencies = SUPPORTED_CURRENCIES.filter(currency => 
    supportedCurrencies.includes(currency.code)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Choose Payment Method'}
            {step === 'payment' && 'Complete Payment'}
            {step === 'confirmation' && 'Payment Successful!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && selectedPlan && `Upgrade to ${selectedPlan.name} plan`}
            {step === 'payment' && 'Send the exact amount to the address below'}
            {step === 'confirmation' && 'Your subscription has been upgraded successfully'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Currency Selection Step */}
        {step === 'select' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Cryptocurrency
              </label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">
                          {currency.symbol}
                        </span>
                        <span className="uppercase font-mono text-xs">
                          {currency.code}
                        </span>
                        <span>{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      <span className="font-medium">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="font-medium">{selectedPlan.priceDescription}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payment Method:</span>
                      <span className="font-medium">
                        {getCurrencyInfo(selectedCurrency).name}
                      </span>
                    </div>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      • Instant activation after blockchain confirmation
                      • No additional fees from our side
                      • Secure cryptocurrency payment
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && paymentData && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="text-center">
              <Badge 
                variant={
                  paymentStatus?.payment_status === 'confirmed' || 
                  paymentStatus?.payment_status === 'finished' ? 'default' :
                  paymentStatus?.payment_status === 'confirming' ? 'secondary' :
                  paymentStatus?.payment_status === 'failed' ? 'destructive' : 'outline'
                }
                className="text-sm"
              >
                {paymentStatus ? 
                  getPaymentStatusText(paymentStatus.payment_status) : 
                  'Waiting for Payment'
                }
              </Badge>
            </div>

            {/* Timer */}
            {timeRemaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time remaining: {formatTime(timeRemaining)}</span>
              </div>
            )}

            {/* Payment Details */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Send exactly this amount:
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-sm font-bold text-center">
                    {formatCurrency(paymentData.pay_amount, paymentData.pay_currency)}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(paymentData.pay_amount.toString(), 'Amount')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  To this address:
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-xs break-all">
                    {paymentData.pay_address}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(paymentData.pay_address, 'Address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              {qrCode && (
                <div className="flex flex-col items-center gap-3">
                  <img src={qrCode} alt="Payment QR Code" className="h-48 w-48" />
                  <div className="text-xs text-muted-foreground">Scan to pay</div>
                </div>
              )}

              {/* Open payment page */}
              {paymentData.payment_url && (
                <Button asChild variant="outline">
                  <a href={paymentData.payment_url} target="_blank" rel="noopener noreferrer">
                    Open Payment Page <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {step === 'confirmation' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
            <div className="text-center space-y-1">
              <div className="font-semibold">Payment Confirmed</div>
              <div className="text-sm text-muted-foreground">
                Your subscription upgrade is now active.
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          {step === 'select' && (
            <Button onClick={handleCreatePayment} disabled={isLoading || !selectedPlan}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Payment
            </Button>
          )}
          {step === 'payment' && (
            <div className="flex w-full items-center justify-between">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => startStatusPolling(paymentData!.payment_id)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}