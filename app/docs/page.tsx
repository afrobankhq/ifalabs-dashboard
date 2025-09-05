"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  BookOpen,
  Code,
  Key,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Play,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall, type ApiEndpoint } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"

const codeExamples = {
  javascript: `// Initialize the API client
const apiKey = 'your-api-key-here';
const baseUrl = 'http://api.ifalabs.com';

// Make a simple API call
async function fetchData() {
  const response = await fetch(\`\${baseUrl}/data\`, {
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}`,
  python: `import requests

# Initialize the API client
api_key = 'your-api-key-here'
base_url = 'http://api.ifalabs.com'

# Make a simple API call
def fetch_data():
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f'{base_url}/data', headers=headers)
    return response.json()`,
  curl: `# Make a simple API call
curl -X GET "http://api.ifalabs.com/api/v1/data" \\
  -H "Authorization: Bearer your-api-key-here" \\
  -H "Content-Type: application/json"`,
}

const quickStartSteps = [
  {
    title: "Create Your Account",
    description: "Sign up for a free account to get started with our API.",
    completed: true,
  },
  {
    title: "Generate API Key",
    description: "Create your first API key from the API Keys section.",
    completed: true,
  },
  {
    title: "Make Your First Call",
    description: "Test the API with a simple GET request to verify everything works.",
    completed: false,
  },
  {
    title: "Explore Endpoints",
    description: "Browse our comprehensive API documentation to discover all available endpoints.",
    completed: false,
  },
]

const apiEndpoints: ApiEndpoint[] = [
  {
    method: "GET",
    endpoint: "/api/v1/data",
    description: "Retrieve all data entries",
    parameters: ["limit", "offset", "filter"],
  },
  {
    method: "POST",
    endpoint: "/api/v1/data",
    description: "Create a new data entry",
    parameters: ["name", "value", "metadata"],
  },
  {
    method: "GET",
    endpoint: "/api/v1/data/{id}",
    description: "Retrieve a specific data entry",
    parameters: ["id"],
  },
  {
    method: "PUT",
    endpoint: "/api/v1/data/{id}",
    description: "Update an existing data entry",
    parameters: ["id", "name", "value", "metadata"],
  },
  {
    method: "DELETE",
    endpoint: "/api/v1/data/{id}",
    description: "Delete a data entry",
    parameters: ["id"],
  },
]

export default function DocsPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [openSections, setOpenSections] = useState<string[]>(["getting-started"])
  const [dynamicApiEndpoints, setDynamicApiEndpoints] = useState<ApiEndpoint[]>([])
  const [apiSchema, setApiSchema] = useState<any>(null)
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()

  useEffect(() => {
    loadDocsData()
  }, [])

  const loadDocsData = async () => {
    try {
      // Load API endpoints
      const endpointsData = await executeApiCall<ApiEndpoint[]>(() => apiService.getApiEndpoints())
      if (Array.isArray(endpointsData)) {
        setDynamicApiEndpoints(endpointsData as ApiEndpoint[])
      }

      // Load API schema
      const schemaData = await executeApiCall(() => apiService.getApiSchema())
      if (schemaData) {
        setApiSchema(schemaData)
      }
    } catch (err) {
      console.error("Failed to load docs data:", err)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Code Copied",
      description: "Code example has been copied to your clipboard.",
    })
  }

  const toggleSection = (section: string) => {
    setOpenSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "POST":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "PUT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Everything you need to get started with our API and integrate it into your applications.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
          <CardDescription>Get up and running in minutes with these simple steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickStartSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-primary">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <Button>
              <Play className="mr-2 h-4 w-4" />
              Try Interactive Tutorial
            </Button>
            <Button variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Examples
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            Code Examples
          </CardTitle>
          <CardDescription>Ready-to-use code snippets in your favorite programming language.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            {Object.entries(codeExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang} className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{code}</code>
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-transparent"
                    onClick={() => handleCopyCode(code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* API Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            API Reference
          </CardTitle>
          <CardDescription>Complete reference for all available API endpoints.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(dynamicApiEndpoints.length > 0 ? dynamicApiEndpoints : apiEndpoints).map((endpoint: ApiEndpoint, index: number) => (
              <Collapsible
                key={index}
                open={openSections.includes(`endpoint-${index}`)}
                onOpenChange={() => toggleSection(`endpoint-${index}`)}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <Badge className={getMethodColor(endpoint.method)}>{endpoint.method}</Badge>
                    <code className="text-sm font-mono">{endpoint.endpoint}</code>
                    <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                  </div>
                  {openSections.includes(`endpoint-${index}`) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="mt-4 space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">Parameters</h5>
                      <div className="space-y-2">
                        {endpoint.parameters.map((param: string, paramIndex: number) => (
                          <div key={paramIndex} className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">{param}</code>
                            <span className="text-sm text-muted-foreground">
                              {param === "id" ? "Required - Unique identifier" : "Optional"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Example Request</h5>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                        <code>
                          {`curl -X ${endpoint.method} "https://api.example.com${endpoint.endpoint}" \\
  -H "Authorization: Bearer your-api-key-here" \\
  -H "Content-Type: application/json"`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Authentication
          </CardTitle>
          <CardDescription>Learn how to authenticate your API requests securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">API Key Authentication</h4>
            <p className="text-sm text-muted-foreground mb-4">
              All API requests must include your API key in the Authorization header using Bearer token format.
            </p>
            <pre className="bg-muted p-3 rounded text-sm">
              <code>Authorization: Bearer your-api-key-here</code>
            </pre>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Rate Limits</h4>
            <p className="text-sm text-muted-foreground mb-2">
              API requests are rate limited based on your subscription plan:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Starter: 1,000 requests per month</li>
              <li>• Pro: 50,000 requests per month</li>
              <li>• Enterprise: Unlimited requests</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Error Handling</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The API uses standard HTTP status codes to indicate success or failure:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">200</Badge>
                <span className="text-sm">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">400</Badge>
                <span className="text-sm">Bad Request</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">401</Badge>
                <span className="text-sm">Unauthorized</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">429</Badge>
                <span className="text-sm">Rate Limited</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get support and connect with our community.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start bg-transparent">
              <ExternalLink className="mr-2 h-4 w-4" />
              Join Discord Community
            </Button>
            <Button variant="outline" className="justify-start bg-transparent">
              <ExternalLink className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </ProtectedRoute>
  )
}
