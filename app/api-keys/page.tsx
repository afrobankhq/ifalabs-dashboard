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
  const [newlyCreatedKeys, setNewlyCreatedKeys] = useState<Map<string, string>>(new Map())
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const profileId = user?.id
        console.log('[API Keys] load:start', {
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
        console.log('[API Keys] load:success', { count: Array.isArray(result.data) ? result.data.length : null, status: result.status, data: result.data })
        setApiKeys(result.data || [])
      } catch (e) {
        console.error('[API Keys] load:error', e)
        if (e instanceof ApiError && e.status === 404) {
          // Treat 404 as no keys yet
          setError(null)
          setApiKeys([])
          console.log('[API Keys] load:empty (404)')
        } else {
          setError("Failed to load API keys")
          setApiKeys([])
        }
      } finally {
        setLoading(false)
        console.debug('[API Keys] load:done')
      }
    }
    
    // Only load if user is available
    if (user?.id) {
      load()
    } else {
      // If no user, set loading to false and clear API keys
      setLoading(false)
      setApiKeys([])
    }
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
      console.log('[API Keys] create:start', { profileId: user.id, payload: { name: newKeyName } })
      const res = await apiService.createProfileApiKey(user.id, { name: newKeyName })
      console.log('[API Keys] create:success', { status: res.status, data: res.data })
      
      // Store the newly created key so it can be copied
      if (res.data?.id && res.data?.key) {
        setNewlyCreatedKeys(prev => new Map(prev).set(res.data.id, res.data.key))
        console.log('[API Keys] create:stored-key', { keyId: res.data.id, key: res.data.key })
        
        // Remove the stored key after 5 minutes for security
        setTimeout(() => {
          setNewlyCreatedKeys(prev => {
            const newMap = new Map(prev)
            newMap.delete(res.data.id)
            console.log('[API Keys] create:removed-stored-key', { keyId: res.data.id })
            return newMap
          })
        }, 5 * 60 * 1000) // 5 minutes
      }
      
      toast({ title: "API Key Created", description: "Key created successfully. You can copy it now." })
      setIsCreateDialogOpen(false)
      resetCreateState()
      await refreshKeys()
    } catch (err) {
      console.error('[API Keys] create:error', err)
      
      let errorMessage = "Failed to create API key."
      
      if (err instanceof ApiError) {
        if (err.status === 500 && err.message.includes('crypto/aes: invalid key size')) {
          errorMessage = "Server configuration error. Please contact support."
        } else if (err.status === 500) {
          errorMessage = "Server error occurred. Please try again later."
        } else if (err.status === 404) {
          errorMessage = "API endpoint not found. Please check your configuration."
        } else {
          errorMessage = err.message || "Failed to create API key."
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" })
    } finally {
      setCreating(false)
      console.log('[API Keys] create:done')
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

  const handleDeleteApiKey = async (id: string) => {
    try {
      console.debug('[API Keys] delete:start', { keyId: id })
      
      // Call the API to delete the key
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      await apiService.deleteApiKey(user.id, id)
      
      // Remove from local state
      setApiKeys(apiKeys.filter((key) => key.id !== id))
      
      console.debug('[API Keys] delete:success', { keyId: id })
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted.",
      })
    } catch (error) {
      console.error('[API Keys] delete:error', error)
      toast({
        title: "Error",
        description: "Failed to delete API key. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleCopyKey = (apiKey: ApiKey) => {
    console.log('[API Keys] handleCopyKey:called', apiKey)
    
    // Check if this is a newly created key that we have stored
    const storedKey = newlyCreatedKeys.get(apiKey.id)
    console.log('[API Keys] handleCopyKey:stored-key-check', { keyId: apiKey.id, storedKey })
    
    // Try different possible field names for the key
    const key = storedKey || apiKey.key || apiKey.api_key || apiKey.token || apiKey.secret
    console.log('[API Keys] handleCopyKey:key-found', { key, hasKey: !!key })
    console.log('[API Keys] handleCopyKey:all-fields', {
      storedKey,
      key: apiKey.key,
      api_key: apiKey.api_key,
      token: apiKey.token,
      secret: apiKey.secret
    })
    
    if (!key) {
      console.log('[API Keys] handleCopyKey:no-key-available')
      toast({
        title: "Key not available",
        description: "API keys are only shown once during creation for security reasons. If you need the key, you'll need to create a new one.",
        variant: "destructive"
      })
      return
    }
    
    console.log('[API Keys] handleCopyKey:copying-key', { key })
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

  const maskKey = (apiKey: ApiKey) => {
    // Check if this is a newly created key that we have stored
    const storedKey = newlyCreatedKeys.get(apiKey.id)
    // Try different possible field names for the key
    const key = storedKey || apiKey.key || apiKey.api_key || apiKey.token || apiKey.secret
    if (!key) return "Key hidden for security"
    if (key.length <= 16) return key // Don't mask short keys
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
        {apiKeys.length === 0 && (
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
        )}
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
                        {visibleKeys.has(apiKey.id) ? (newlyCreatedKeys.get(apiKey.id) || apiKey.key || apiKey.api_key || apiKey.token || apiKey.secret || "Key hidden for security") : maskKey(apiKey)}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => toggleKeyVisibility(apiKey.id)}>
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          console.log('[API Keys] copy-button-clicked', { apiKey })
                          handleCopyKey(apiKey)
                        }}
                        disabled={false}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{apiKey.subscription_plan || apiKey.plan || apiKey.subscription || "—"}</Badge>
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
                        <DropdownMenuItem 
                          onClick={() => {
                            console.log('[API Keys] dropdown-copy-clicked', { apiKey })
                            handleCopyKey(apiKey)
                          }}
                          disabled={false}
                        >
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
              {!loading && apiKeys.length > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground bg-muted/50">
                    <div className="flex items-center gap-2 p-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>API keys are only shown once during creation for security. Use the copy button if you have the key available.</span>
                    </div>
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