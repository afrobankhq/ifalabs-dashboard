"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, Loader2, AlertCircle, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { tokenService } from "@/lib/token-service"
import { ProtectedRoute } from "@/components/protected-route"

interface PaymentSuccessData {
  planName: string
  billingFrequency?: string
  paymentId?: string
  amount?: number
  currency?: string
  transactionHash?: string
}

function PaymentSuccessContent() {
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null)
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false)
  const [subscriptionUpdated, setSubscriptionUpdated] = useState(false)
  const [hasUpdatedProfile, setHasUpdatedProfile] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (!user || hasUpdatedProfile) return
    
    // Extract payment data from URL parameters
    const planName = searchParams.get('plan')
    const billingFrequency = searchParams.get('billing')
    const paymentId = searchParams.get('payment_id')
    const amount = searchParams.get('amount')
    const currency = searchParams.get('currency')
    const transactionHash = searchParams.get('tx_hash')

    if (planName) {
      setPaymentData({
        planName: decodeURIComponent(planName),
        billingFrequency: billingFrequency || 'monthly',
        paymentId: paymentId || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency: currency || 'USD',
        transactionHash: transactionHash || undefined,
      })
      
      // Automatically update subscription plan (only once)
      updateSubscriptionPlan(planName)
      setHasUpdatedProfile(true)
    } else {
      // Redirect to plans page if no plan specified
      router.push('/plan')
    }
  }, [user, searchParams, router, hasUpdatedProfile])

  // Update subscription plan function
  const updateSubscriptionPlan = async (planName: string) => {
    if (!user) return

    try {
      setIsUpdatingSubscription(true)
      
      const planIdMap: Record<string, string> = {
        'Free Tier': 'free',
        'Developer Tier': 'developer', 
        'Professional Tier': 'professional',
        'Enterprise Tier': 'enterprise',
      }
      
      const planId = planIdMap[planName] || planName.toLowerCase()
      console.log('Updating subscription to:', planId, 'for user:', user.id)

      // Use the API service to update the subscription plan
      console.log('Calling apiService.updateSubscriptionPlan with:', { userId: user.id, planId })
      
      try {
        // First, test if the API is reachable
        console.log('Testing API connectivity...')
        try {
          const testResponse = await apiService.getCompanyProfile(user.id)
          console.log('API connectivity test - Profile response:', testResponse)
        } catch (testError) {
          console.error('API connectivity test failed:', testError)
          throw new Error(`API server not reachable: ${testError instanceof Error ? testError.message : String(testError)}`)
        }
        
        const response = await apiService.updateSubscriptionPlan(user.id, planId)
        console.log('API response:', response)
      
      if (response && response.data) {
        const updatedProfile = response.data
          console.log('Successfully updated subscription plan via API:', planId)
          console.log('Updated profile data:', updatedProfile)
        
        // Update localStorage with backend data
        const profileWithSubscriptionDate = {
          ...updatedProfile,
          subscription_start_date: new Date().toISOString()
        }
        localStorage.setItem('user_profile', JSON.stringify(profileWithSubscriptionDate))
        localStorage.setItem('subscription_plan', planId)
        localStorage.setItem('subscription_start_date', new Date().toISOString())
        localStorage.setItem('profile_updated_timestamp', Date.now().toString())

          // Dispatch events to notify all pages
          const profileUpdateEvent = new CustomEvent('profileUpdated', { 
            detail: { 
              profile: updatedProfile,
              subscription_plan: planId,
              timestamp: Date.now(),
              source: 'payment_success_api_service'
            } 
          })
          window.dispatchEvent(profileUpdateEvent)
          
          // Also dispatch a profile refreshed event
          const profileRefreshEvent = new CustomEvent('profileRefreshed', { 
          detail: { 
            profile: updatedProfile,
            subscription_plan: planId,
            timestamp: Date.now(),
            source: 'payment_success_api_service'
          } 
          })
          window.dispatchEvent(profileRefreshEvent)
          
          console.log('✅ Events dispatched to notify all pages of subscription update')

        setSubscriptionUpdated(true)
          
          console.log('✅ Subscription successfully updated in backend database:', {
            userId: user.id,
            newPlan: planId,
            profileData: updatedProfile
          })
        
        toast({
          title: "Backend Updated Successfully!",
          description: `Subscription updated to ${planName} in database.`,
        })
        } else {
          console.error('❌ Failed to update subscription plan - API response was null or invalid')
          console.error('Response:', response)
          
          // Fallback: update localStorage anyway for immediate UI feedback
          localStorage.setItem('subscription_plan', planId)
          localStorage.setItem('subscription_start_date', new Date().toISOString())
          localStorage.setItem('profile_updated_timestamp', Date.now().toString())
          
          toast({
            title: "Warning: API Update Failed",
            description: "Subscription updated locally but failed to save to database. Please refresh the page.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('❌ Error updating subscription plan:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: user.id,
          planId: planId
        })
        
        // Fallback: update localStorage anyway for immediate UI feedback
        localStorage.setItem('subscription_plan', planId)
        localStorage.setItem('subscription_start_date', new Date().toISOString())
        localStorage.setItem('profile_updated_timestamp', Date.now().toString())
        
        toast({
          title: "Error: API Update Failed",
          description: `Failed to update subscription: ${error instanceof Error ? error.message : String(error)}. Updated locally only.`,
          variant: "destructive"
        })
      }

        // Setup billing information for paid plans
        if (planId !== 'free') {
          console.log('Setting up billing information for plan:', planId)
          setupBillingInformation(planId, planName).catch(err => 
          console.error('Failed to setup billing information:', err)
        )
      }

    } catch (error) {
      console.error('Error in updateSubscriptionPlan:', error)
      toast({
        title: "Update Failed",
        description: `Failed to update subscription: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      })
    } finally {
      setIsUpdatingSubscription(false)
    }
  }

  // Setup billing information for paid plans
  const setupBillingInformation = async (planId: string, planName: string) => {
    if (!user || !paymentData) return

    try {
      console.log('Setting up billing information for:', { planId, planName, paymentData })
      
      // Create a billing record
      const billingData = {
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        billing_frequency: paymentData.billingFrequency || 'monthly',
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        payment_id: paymentData.paymentId,
        transaction_hash: paymentData.transactionHash,
        status: 'completed',
        created_at: new Date().toISOString()
      }

      console.log('Billing data to be stored:', billingData)
      
      // Store billing information in localStorage for now
      const existingBilling = JSON.parse(localStorage.getItem('billing_history') || '[]')
        existingBilling.push(billingData)
      localStorage.setItem('billing_history', JSON.stringify(existingBilling))
      
      console.log('✅ Billing information stored successfully')

      } catch (error) {
      console.error('Failed to setup billing information:', error)
    }
  }

  const handleContinueToDashboard = () => {
    router.push('/dashboard')
  }

  const handleViewPlans = () => {
    router.push('/plan')
  }

  const handleViewBilling = () => {
    router.push('/billing')
  }

  if (!paymentData) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading payment information...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
        {/* Success Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Successful!
            </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Your subscription has been activated successfully.
            </p>
        </div>

            {/* Payment Details Card */}
            <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</p>
                    <p className="text-lg font-semibold">{paymentData.planName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Active
                  </Badge>
                </div>
              </div>
              
              {paymentData.amount && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</p>
                      <p className="text-lg font-semibold">
                        {paymentData.currency} ${paymentData.amount.toFixed(2)}
                      </p>
                    </div>
                    {paymentData.paymentId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment ID</p>
                        <p className="text-sm font-mono">{paymentData.paymentId}</p>
                </div>
              )}
                </div>
              )}
              
              {paymentData.transactionHash && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Hash</p>
                    <p className="text-sm font-mono break-all">{paymentData.transactionHash}</p>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Subscription Update Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isUpdatingSubscription ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : subscriptionUpdated ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isUpdatingSubscription ? (
                  <p className="text-gray-600 dark:text-gray-300">
                    Updating your subscription in our system...
                  </p>
                ) : subscriptionUpdated ? (
                  <p className="text-green-600 dark:text-green-400">
                    ✅ Your subscription has been successfully updated in our system.
                  </p>
                ) : (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ Subscription update is in progress...
                  </p>
                )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
            <div className="space-y-4">
              <Button 
                onClick={handleContinueToDashboard}
                className="w-full"
                size="lg"
              >
            Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={handleViewPlans}
                  variant="outline" 
                  className="w-full"
                >
                  View All Plans
                </Button>
                
                <Button 
                  onClick={handleViewBilling}
                  variant="outline" 
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Billing
                </Button>
              </div>
            </div>

            {/* Additional Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p>• Your new plan features are now active</p>
                <p>• You can manage your subscription from the dashboard</p>
                <p>• Check your email for the payment confirmation</p>
                <p>• Contact support if you have any questions</p>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading payment information...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
