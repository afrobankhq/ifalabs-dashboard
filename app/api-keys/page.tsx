"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Key, Plus, Copy, MoreHorizontal, Trash2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"
import { apiService, type ApiKey, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function ApiKeysPage() {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [creating, setCreating] = useState<boolean>(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const profileId = user?.id
        console.debug('[API Keys] load:start', {
          profileId,
          API_URL: process.env.NEXT_PUBLIC_API_URL || '(proxy /api/proxy)',
          PROFILE_KEYS_PATH: process.env.NEXT_PUBLIC_PROFILE_KEYS_PATH,
        })
        if (!profileId) {
          setApiKeys([])
          setLoading(false)
          console.warn('[API Keys] load:missing-profile-id')
          return
        }
        const result = await apiService.getProfileApiKeys(profileId)
        console.debug('[API Keys] load:success', { count: Array.isArray(result.data) ? result.data.length : null, status: result.status })
        setApiKeys(result.data || [])
      } catch (e) {
        console.error('[API Keys] load:error', e)
        if (e instanceof ApiError && e.status === 404) {
          // Treat 404 as no keys yet
          setError(null)
          setApiKeys([])
          console.debug('[API Keys] load:empty (404)')
        } else {
          setError("Failed to load API keys")
          setApiKeys([])
        }
      } finally {
        setLoading(false)
        console.debug('[API Keys] load:done')
      }
    }
    load()
  }, [user])

  const handleCreateApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newKeyName.trim()) {
      toast({ title: "Error", description: "Please enter a name for your API key.", variant: "destructive" })
      return
    }
    if (!user?.id) {
      toast({ title: "Error", description: "Missing profile id.", variant: "destructive" })
      return
    }
    try {
      setCreating(true)
      console.debug('[API Keys] create:start', { profileId: user.id, payload: { name: newKeyName } })
      const res = await apiService.createProfileApiKey(user.id, { name: newKeyName })
      console.debug('[API Keys] create:success', { status: res.status, data: res.data })
      toast({ title: "API Key Created", description: "Key created successfully." })
      setIsCreateDialogOpen(false)
      resetCreateState()
      await refreshKeys()
    } catch (err) {
      console.error('[API Keys] create:error', err)
      toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" })
    } finally {
      setCreating(false)
      console.debug('[API Keys] create:done')
    }
  }

  const refreshKeys = async () => {
    try {
      if (!user?.id) {
        console.warn('[API Keys] refresh:missing-profile-id')
        return
      }
      console.debug('[API Keys] refresh:start', { profileId: user.id })
      const result = await apiService.getProfileApiKeys(user.id)
      console.debug('[API Keys] refresh:success', { count: Array.isArray(result.data) ? result.data.length : null, status: result.status })
      setApiKeys(result.data || [])
    } catch (e) {
      console.error('[API Keys] refresh:error', e)
    }
  }

  const resetCreateState = () => {
    setNewKeyName("")
  }

  const handleCreateDone = async () => {
    setIsCreateDialogOpen(false)
    await refreshKeys()
    resetCreateState()
  }

  const handleDeleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id))
    toast({
      title: "API Key Deleted",
      description: "The API key has been permanently deleted.",
    })
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    })
  }

  const toggleKeyVisibility = (id: string) => {
    const newVisibleKeys = new Set(visibleKeys)
    if (newVisibleKeys.has(id)) {
      newVisibleKeys.delete(id)
    } else {
      newVisibleKeys.add(id)
    }
    setVisibleKeys(newVisibleKeys)
  }

  const maskKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4)
  }

  return (
    <ProtectedRoute>
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for different environments and applications.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetCreateState() }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for your application. Choose a descriptive name and environment.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateApiKey} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Mobile App"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create API Key"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : apiKeys.length}</div>
            {!loading && (
              <p className="text-xs text-muted-foreground">
                {apiKeys.filter((k) => k.is_active).length} active
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage and monitor your API keys. Keep your keys secure and rotate them regularly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-red-600 mb-4">{error}</div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Subscription Plan</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => toggleKeyVisibility(apiKey.id)}>
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyKey(apiKey.key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{apiKey.subscription_plan || "—"}</Badge>
                  </TableCell>
                  <TableCell>{apiKey.last_used ? new Date(apiKey.last_used).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell>
                    <Badge variant={apiKey.is_active ? "default" : "secondary"}>{apiKey.is_active ? "active" : "inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Key
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteApiKey(apiKey.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No API keys found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  )
}