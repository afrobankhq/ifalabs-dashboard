"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Download, CreditCard, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { PaymentDialog } from "../../components/payment-dialog"

interface Invoice {
  id: string
  invoice_number: string
  account_id: string
  amount: number // Amount in cents
  currency: string
  due_date: string
  issued_at: string
  status: 'pending' | 'paid' | 'failed' | 'void'
  metadata: {
    plan_id?: string
    billing_cycle?: string
    payment_method?: string
    subscription_id?: string
    created_from?: string
  }
  paid_at?: string
  payment_id?: string
  created_at: string
  updated_at: string
}

interface InvoiceListResponse {
  invoices: Invoice[]
  total_count: number
  page: number
  page_size: number
}

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { execute: executeApiCall } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadInvoices()
    }
  }, [user])

  const loadInvoices = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await executeApiCall(() => apiService.getInvoices(user.id))
      
      if (response && typeof response === 'object' && 'invoices' in response) {
        const invoiceData = response as InvoiceListResponse
        setInvoices(invoiceData.invoices || [])
      } else {
        // Handle case where response is directly an array
        setInvoices(Array.isArray(response) ? response : [])
      }
    } catch (error) {
      console.error('Failed to load invoices:', error)
      toast({
        title: "Error",
        description: "Failed to load invoices. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayInvoice = (invoice: Invoice) => {
    if (invoice.status !== 'pending') {
      toast({
        title: "Cannot Pay Invoice",
        description: "This invoice is not in pending status.",
        variant: "destructive",
      })
      return
    }

    setSelectedInvoice(invoice)
    setIsPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    if (selectedInvoice) {
      toast({
        title: "Payment Successful",
        description: `Invoice ${selectedInvoice.invoice_number} has been paid successfully!`,
      })
      
      // Reload invoices to reflect the updated status
      loadInvoices()
    }
    
    setIsPaymentDialogOpen(false)
    setSelectedInvoice(null)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'void':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'void':
        return <Badge variant="outline">Void</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">View and manage your invoices</p>
        </div>

        {/* Invoice List */}
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                <p className="text-muted-foreground text-center">
                  You don't have any invoices yet. Invoices will appear here when you make payments or when they are generated for your subscription.
                </p>
              </CardContent>
            </Card>
          ) : (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                        <CardDescription>
                          Issued on {formatDate(invoice.issued_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due {formatDate(invoice.due_date)}
                        </div>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(invoice.status)}
                          <span className="capitalize">{invoice.status}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Plan:</span>
                        <div className="mt-1 capitalize">
                          {invoice.metadata?.plan_id || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Billing Cycle:</span>
                        <div className="mt-1 capitalize">
                          {invoice.metadata?.billing_cycle || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Payment Method:</span>
                        <div className="mt-1 capitalize">
                          {invoice.metadata?.payment_method || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    {invoice.status === 'paid' && invoice.paid_at && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Payment Completed</span>
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          Paid on {formatDate(invoice.paid_at)}
                          {invoice.payment_id && (
                            <span className="ml-2">• Payment ID: {invoice.payment_id}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                      
                      {invoice.status === 'pending' && (
                        <Button 
                          onClick={() => handlePayInvoice(invoice)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Payment Dialog */}
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          selectedPlan={selectedInvoice ? {
            id: selectedInvoice.metadata?.plan_id || 'unknown',
            name: `${selectedInvoice.metadata?.plan_id || 'Unknown'} Plan`,
            price: selectedInvoice.amount / 100,
            priceDescription: formatAmount(selectedInvoice.amount, selectedInvoice.currency),
            description: `Payment for invoice ${selectedInvoice.invoice_number}`,
            features: {
              dataAccess: 'N/A',
              apiRequests: 'N/A',
              rateLimit: 'N/A',
              requestCall: 'N/A',
              support: 'N/A'
            },
            billingFrequency: selectedInvoice.metadata?.billing_cycle as 'monthly' | 'annual' || 'monthly'
          } : null}
          onPaymentSuccess={handlePaymentSuccess}
          invoiceId={selectedInvoice?.id}
        />
      </div>
    </ProtectedRoute>
  )
}
