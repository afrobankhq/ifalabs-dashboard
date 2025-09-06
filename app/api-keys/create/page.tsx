"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"
import { apiService, type CreatedApiKeyResponse } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

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
      const res = await apiService.createProfileApiKey(user.id, { name })
      setCreated(res.data)
      toast({ title: "API Key Created", description: res.data.message || "Key created successfully." })
    } catch (err) {
      toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDone = () => {
    router.push("/api-keys")
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
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production Mobile App"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Copy and store your key securely. You won’t be able to see it again.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Key Name</Label>
                  <div className="text-sm">{created.name}</div>
                </div>
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded break-all">{created.key}</code>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { navigator.clipboard.writeText(created.key); toast({ title: "Copied", description: "Key copied to clipboard." }) }}>Copy</Button>
                  <Button variant="outline" onClick={handleDone}>Done</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}


