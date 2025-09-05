"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Download,
  Calendar,
  DollarSign,
  Receipt,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"

interface Invoice {
  id: string
  date: string
  amount: number
  status: "paid" | "pending" | "failed"
  description: string
  downloadUrl: string
}

const invoices: Invoice[] = [
  {
    id: "INV-001",
    date: "2025-01-15",
    amount: 29.0,
    status: "paid",
    description: "Dev Plan - January 2025",
    downloadUrl: "#",
  },
  {
    id: "INV-002",
    date: "2025-12-15",
    amount: 29.0,
    status: "paid",
    description: "Dev Plan - December 2023",
    downloadUrl: "#",
  },
  {
    id: "INV-003",
    date: "2025-11-15",
    amount: 29.0,
    status: "paid",
    description: "Dev Plan - November 2023",
    downloadUrl: "#",
  },
  {
    id: "INV-004",
    date: "2025-10-15",
    amount: 0.0,
    status: "paid",
    description: "Starter Plan - October 2023",
    downloadUrl: "#",
  },
]

export default function BillingPage() {
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      // Load billing info
      const billingData = await executeApiCall(() => apiService.getBillingInfo())
      if (billingData) {
        setBillingInfo(billingData)
      }

      // Load invoices
      const invoiceData = await executeApiCall(() => apiService.getInvoices())
      if (invoiceData) {
        setInvoices(invoiceData)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load billing data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      await executeApiCall(() => apiService.downloadInvoice(invoice.id))
      toast({
        title: "Download Started",
        description: `Downloading invoice ${invoice.id}...`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (loading && !billingInfo) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your billing information and view payment history.</p>
      </div>

      {/* Billing Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.currentBalance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{billingInfo?.balanceStatus || 'No outstanding balance'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.nextPayment?.amount?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Due {billingInfo?.nextPayment?.date || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.monthlyUsage?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{billingInfo?.planName || 'No active plan'}</p>
          </CardContent>
        </Card>
      </div>



      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>View and download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.description}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Billing Alerts */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
            Billing Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Your next payment of $50.00 will be automatically charged to your default payment method on September 25,
            2025.
          </p>
        </CardContent>
      </Card>
      </div>
    </ProtectedRoute>
  )
}
