"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Key, Users, CreditCard, TrendingUp, Activity, DollarSign, Calendar } from "lucide-react"
import { useEffect, useState } from 'react'
import { apiService, type ApiKey, type CompanyProfile } from '@/lib/api'
import { authService } from '@/lib/auth'
import { useAuth } from '@/lib/auth-context'

export default function DashboardPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[] | null>(null)
  const [apiRequests, setApiRequests] = useState<number | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const { user } = useAuth()

  useEffect(() => {
    const load = async () => {
      try {
        const currentUser = user ?? authService.getCurrentUser()
        if (!currentUser?.id) return
        const prof = await apiService.getCompanyProfile(currentUser.id)
        setProfile(prof.data)
        const planId = (prof.data?.subscription_plan || '').toLowerCase().trim()
        setCurrentPlan(planId || 'free')

        const keys = await apiService.getProfileApiKeys(currentUser.id)
        setApiKeys(keys.data)
        const usage = await apiService.getProfileUsage(currentUser.id, 1, 20)
        const total = typeof usage.data === 'object' && usage.data
          ? (usage.data.total ?? usage.data.count ?? (Array.isArray(usage.data) ? usage.data.length : 0))
          : 0
        setApiRequests(Number(total) || 0)
      } catch (e) {
        setApiKeys([])
        setApiRequests(0)
        setCurrentPlan('free')
      }
    }
    load()
  }, [user])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your account activity.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys ? apiKeys.length : '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiRequests ?? '—'}</div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPlan || '—'}</div>
            <p className="text-xs text-muted-foreground">
              <Badge variant="secondary">Active</Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Key className="mr-2 h-4 w-4" />
              Create New API Key
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Update Billing Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}