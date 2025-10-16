"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, User, ArrowRight, XCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

function CompleteRegistrationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()

  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const tokenParam = searchParams.get('token')
      
      if (!tokenParam) {
        setVerificationError('No verification token found. Please check your email link.')
        setIsVerifying(false)
        return
      }

      try {
        console.log('[Complete Registration] Verifying token...')
        const response = await fetch(`/api/auth/register/verify?token=${encodeURIComponent(tokenParam)}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          throw new Error(data.error || 'Invalid or expired verification token')
        }

        console.log('[Complete Registration] Token verified successfully')
        setToken(tokenParam)
        setEmail(data.email)
      } catch (err) {
        console.error('[Complete Registration] Verification error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify token'
        setVerificationError(errorMessage)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      console.log('[Complete Registration] Submitting registration...')

      // Complete registration
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name,
          first_name: firstName,
          last_name: lastName,
          password,
          description,
          website,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration')
      }

      console.log('[Complete Registration] Registration completed successfully')
      toast({ 
        title: "Account created!", 
        description: "Welcome to IFA Labs! Logging you in..." 
      })

      // Auto-login after successful registration
      try {
        await login({ email, password })
        // Login will redirect to dashboard
      } catch (loginError) {
        console.error('[Complete Registration] Auto-login failed:', loginError)
        // Redirect to login page if auto-login fails
        toast({
          title: "Registration successful",
          description: "Please log in to continue",
        })
        router.push('/login')
      }
    } catch (err) {
      console.error('[Complete Registration] Error:', err)
      const errorMessage = err instanceof Error ? err.message : "Registration failed. Please try again."
      setError(errorMessage)
      toast({ 
        title: "Registration Failed", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-populate name when first and last name change
  useEffect(() => {
    if (firstName || lastName) {
      setName(`${firstName} ${lastName}`.trim())
    }
  }, [firstName, lastName])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>{verificationError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The verification link may have expired or is invalid.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push('/signup')}
            >
              Try signing up again
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">IFA LABS</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">Complete Your Registration</h1>
          <p className="text-muted-foreground">
            Email verified: <strong>{email}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Enter your details to complete registration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    type="text" 
                    placeholder="John" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                    disabled={isSubmitting} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    type="text" 
                    placeholder="Doe" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    required 
                    disabled={isSubmitting} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Create a password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="pl-10" 
                    required 
                    disabled={isSubmitting}
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Confirm your password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="pl-10" 
                    required 
                    disabled={isSubmitting}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Bio (Optional)</Label>
                <Input 
                  id="description" 
                  type="text" 
                  placeholder="Tell us about yourself" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={isSubmitting} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input 
                  id="website" 
                  type="url" 
                  placeholder="https://yourwebsite.com" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)} 
                  disabled={isSubmitting} 
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <CompleteRegistrationContent />
    </Suspense>
  )
}

