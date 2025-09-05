"use client"

import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Key, Plus, Copy, MoreHorizontal, Trash2, Eye, EyeOff, Calendar, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/protected-route"

interface ApiKey {
  id: string
  name: string
  key: string
  environment: "production" | "development" | "staging"
  createdAt: string
  lastUsed: string | null
  requests: number
  status: "active" | "inactive"
}

const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production Mobile App",
    key: "sk_prod_1234567890abcdef",
    environment: "production",
    createdAt: "2025-07-28",
    lastUsed: "2025-08-28",
    requests: 15420,
    status: "active",
  },
  {
    id: "2",
    name: "Development Testing",
    key: "sk_dev_abcdef1234567890",
    environment: "development",
    createdAt: "2025-01-10",
    lastUsed: "2025-06-19",
    requests: 892,
    status: "active",
  },
  {
    id: "3",
    name: "Staging Environment",
    key: "sk_staging_fedcba0987654321",
    environment: "staging",
    createdAt: "2025-01-05",
    lastUsed: null,
    requests: 0,
    status: "inactive",
  },
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<"production" | "development" | "staging">("development")
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key.",
        variant: "destructive",
      })
      return
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `sk_${newKeyEnvironment}_${Math.random().toString(36).substring(2, 18)}`,
      environment: newKeyEnvironment,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: null,
      requests: 0,
      status: "active",
    }

    setApiKeys([...apiKeys, newKey])
    setNewKeyName("")
    setNewKeyEnvironment("development")
    setIsCreateDialogOpen(false)

    toast({
      title: "API Key Created",
      description: `${newKey.name} has been created successfully.`,
    })
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

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "staging":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "development":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Mobile App"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={newKeyEnvironment}
                  onValueChange={(value: "production" | "development" | "staging") => setNewKeyEnvironment(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateApiKey}>Create API Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeys.filter((key) => key.status === "active").length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.reduce((sum, key) => sum + key.requests, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all keys</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys
                .reduce((max, key) => (key.requests > max.requests ? key : max), apiKeys[0])
                ?.name.split(" ")[0] || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Highest usage</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
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
                    <Badge className={getEnvironmentColor(apiKey.environment)}>{apiKey.environment}</Badge>
                  </TableCell>
                  <TableCell>{apiKey.requests.toLocaleString()}</TableCell>
                  <TableCell>{apiKey.lastUsed ? new Date(apiKey.lastUsed).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell>
                    <Badge variant={apiKey.status === "active" ? "default" : "secondary"}>{apiKey.status}</Badge>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  )
}