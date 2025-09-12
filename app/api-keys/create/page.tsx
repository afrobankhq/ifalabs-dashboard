"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiService, ApiError } from "@/lib/api"

interface CreatedApiKeyResponse {
  id: string
  key: string
  message: string
  name: string
}

export default function CreateApiKeyPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<CreatedApiKeyResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: "Error", description: "Please enter a name.", variant: "destructive" })
      return
    }
    if (!user?.id) {
      toast({ title: "Error", description: "Missing profile id.", variant: "destructive" })
      return
    }

    try {
      setSubmitting(true)
      
      const payload = {
        name: name.trim()
      }

      console.debug('[CreateApiKey] submitting', {
        payload,
        profileId: user.id
      })

      const response = await apiService.createProfileApiKey(user.id, payload)
      
      console.debug('[CreateApiKey] success', response)
      setCreated(response.data)
      toast({ 
        title: "API Key Created", 
        description: response.data.message || "Key created successfully." 
      })
      
    } catch (err) {
      console.debug('[CreateApiKey] error', err)
      
      let errorMessage = "Failed to create API key."
      
      if (err instanceof ApiError) {
        // Handle different error status codes
        if (err.status === 400) {
          // Bad Request - validation errors
          errorMessage = err.message || "Invalid request data."
        } else if (err.status === 401) {
          // Unauthorized
          errorMessage = "You are not authorized to perform this action."
        } else if (err.status === 403) {
          // Forbidden
          errorMessage = "Access forbidden. You don't have permission to create API keys."
        } else if (err.status === 404) {
          // Not Found - API endpoint doesn't exist
          errorMessage = "API endpoint not found. Please check your configuration."
        } else if (err.status === 500) {
          // Internal Server Error
          errorMessage = "Server error occurred. Please try again later."
        } else {
          errorMessage = err.message || "Failed to create API key."
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDone = () => {
    router.push("/api-keys")
  }

  const handleCopyKey = async () => {
    if (created?.key) {
      try {
        await navigator.clipboard.writeText(created.key)
        toast({ title: "Copied", description: "API key copied to clipboard." })
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
        toast({ 
          title: "Copy Failed", 
          description: "Failed to copy to clipboard. Please select and copy manually.", 
          variant: "destructive" 
        })
      }
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>
              Create a new API key for accessing the Oracle Engine API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!created ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production Mobile App"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your API key a descriptive name to help you identify it later.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting || !name.trim()}>
                    {submitting ? "Creating..." : "Create API Key"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()} 
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    Important: Save your API key now
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Copy and store your key securely. You won't be able to see it again after leaving this page.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label>API Key ID</Label>
                  <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {created.id}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>Key Name</Label>
                  <div className="text-sm">{created.name}</div>
                </div>
                
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-sm bg-muted px-3 py-2 rounded break-all font-mono select-all">
                      {created.key}
                    </code>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleCopyKey}>
                    Copy Key
                  </Button>
                  <Button variant="outline" onClick={handleDone}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}