"use client"

import { useState, useEffect } from "react"
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Activity,
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  TrendingUp,
  Server,
  Database,
  Globe,
  Zap,
  BarChart3,
  Loader2
} from "lucide-react"
import { apiService, useApiCall } from "@/lib/api"
import { ProtectedRoute } from "@/components/protected-route"

// Mock data - in production this would come from API endpoints
const mockData = {
  overallStatus: "operational", // operational, degraded, down
  lastUpdated: new Date().toISOString(),
  services: [
    {
      id: 1,
      name: "API Gateway",
      description: "Main API entry point",
      status: "operational",
      uptime: 99.98,
      responseTime: 45,
      icon: Server
    },
    {
      id: 2,
      name: "Database Cluster",
      description: "Primary data storage",
      status: "operational",
      uptime: 99.95,
      responseTime: 12,
      icon: Database
    },
    {
      id: 3,
      name: "Web Application",
      description: "Frontend application",
      status: "operational",
      uptime: 99.99,
      responseTime: 89,
      icon: Globe
    },
    {
      id: 4,
      name: "Blockchain Watcher",
      description: "Blockchain monitoring service",
      status: "degraded",
      uptime: 98.5,
      responseTime: 250,
      icon: Zap
    }
  ],
  incidents: [
    {
      id: 1,
      service: "Blockchain Watcher",
      title: "Increased response times detected",
      description: "We're experiencing higher than normal response times from our blockchain monitoring service. Our team is investigating.",
      status: "investigating", // investigating, identified, monitoring, resolved
      severity: "medium",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      resolvedAt: null
    },
    {
      id: 2,
      service: "API Gateway",
      title: "Scheduled maintenance completed",
      description: "Routine maintenance has been completed successfully. All services are operating normally.",
      status: "resolved",
      severity: "low",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ],
  uptimeData: {
    last90Days: 99.87,
    last30Days: 99.92,
    last7Days: 99.98,
    last24Hours: 100.00
  }
}

// Mock uptime data for chart (simplified - in production use chart.js or recharts)
const generateUptimeData = () => {
  const data = []
  const now = new Date()
  
  for (let i = 89; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    data.push({
      date: date.toISOString().split('T')[0],
      uptime: 95 + Math.random() * 5, // Random between 95-100%
      incidents: Math.random() > 0.9 ? 1 : 0 // 10% chance of incident
    })
  }
  
  return data
}

const uptimeChartData = generateUptimeData()

function StatusPage() {
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [uptimeStats, setUptimeStats] = useState<any>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("90d")
  const [email, setEmail] = useState("")
  const [slackWebhook, setSlackWebhook] = useState("")
  const { execute: executeApiCall, loading, error } = useApiCall()

  useEffect(() => {
    loadStatusData()
  }, [])

  const loadStatusData = async () => {
    try {
      // Load system status
      const statusData = await executeApiCall(() => apiService.getSystemStatus())
      if (statusData) {
        setSystemStatus(statusData)
      }

      // Load services
      const servicesData = await executeApiCall(() => apiService.getServiceStatus())
      if (servicesData) {
        setServices(servicesData)
      }

      // Load incidents
      const incidentsData = await executeApiCall(() => apiService.getIncidents())
      if (incidentsData) {
        setIncidents(incidentsData)
      }

      // Load uptime stats
      const uptimeData = await executeApiCall(() => apiService.getUptimeStats())
      if (uptimeData) {
        setUptimeStats(uptimeData)
      }
    } catch (err) {
      console.error("Failed to load status data:", err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "text-green-600 bg-green-100"
      case "degraded": return "text-yellow-600 bg-yellow-100"
      case "down": return "text-red-600 bg-red-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational": return <CheckCircle className="w-5 h-5" />
      case "degraded": return <AlertTriangle className="w-5 h-5" />
      case "down": return <XCircle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  const getIncidentColor = (severity: string) => {
    switch (severity) {
      case "critical": return "border-red-500 bg-red-50"
      case "high": return "border-orange-500 bg-orange-50"
      case "medium": return "border-yellow-500 bg-yellow-50"
      case "low": return "border-blue-500 bg-blue-50"
      default: return "border-gray-500 bg-gray-50"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    }
  }

  if (loading && !systemStatus) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  // Use API data or fallback to mock data
  const statusData = systemStatus || mockData
  const servicesData = services.length > 0 ? services : mockData.services
  const incidentsData = incidents.length > 0 ? incidents : mockData.incidents
  const uptimeData = uptimeStats || mockData.uptimeData

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">System Status</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of IFA Labs services and infrastructure
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          Last updated: {formatDate(statusData.lastUpdated)}
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Overall System Status</h2>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(statusData.overallStatus)}`}>
                {getStatusIcon(statusData.overallStatus)}
                {statusData.overallStatus.charAt(0).toUpperCase() + statusData.overallStatus.slice(1)}
              </div>
              <span className="text-muted-foreground">
                All systems operational with minor issues
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{uptimeData.last90Days}%</div>
            <div className="text-sm text-muted-foreground">90-day uptime</div>
          </div>
        </div>
      </div>

      {/* Uptime Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{uptimeData.last24Hours}%</div>
              <div className="text-sm text-muted-foreground">Last 24 hours</div>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{uptimeData.last7Days}%</div>
              <div className="text-sm text-muted-foreground">Last 7 days</div>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{uptimeData.last30Days}%</div>
              <div className="text-sm text-muted-foreground">Last 30 days</div>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold">{uptimeData.last90Days}%</div>
              <div className="text-sm text-muted-foreground">Last 90 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Services Status</h2>
        <div className="space-y-4">
          {servicesData.map((service) => (
            <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <service.icon className="w-8 h-8 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Response Time</div>
                  <div className="font-medium">{service.responseTime}ms</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="font-medium">{service.uptime}%</div>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uptime Chart */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">90-Day Uptime History</h2>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  selectedTimeframe === timeframe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
        
        {/* Simplified chart visualization */}
        <div className="h-64 bg-muted rounded-lg p-4">
          <div className="flex items-end justify-between h-full gap-1">
            {uptimeChartData.slice(-30).map((day, index) => (
              <div
                key={index}
                className="flex-1 bg-primary rounded-t"
                style={{
                  height: `${day.uptime}%`,
                  opacity: day.incidents > 0 ? 0.6 : 1
                }}
                title={`${day.date}: ${day.uptime.toFixed(2)}% uptime`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-card border rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Recent Incidents</h2>
        <div className="space-y-4">
          {incidentsData.map((incident) => (
            <div key={incident.id} className={`border-l-4 p-4 rounded-lg ${getIncidentColor(incident.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{incident.title}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-2">{incident.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Service: {incident.service}</span>
                    <span>Created: {getTimeAgo(incident.createdAt)}</span>
                    {incident.updatedAt && (
                      <span>Updated: {getTimeAgo(incident.updatedAt)}</span>
                    )}
                    {incident.resolvedAt && (
                      <span>Resolved: {getTimeAgo(incident.resolvedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">Get Notified</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Subscribe to Updates
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Slack Integration
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Slack webhook URL"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                Connect Slack
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  )
}

export default StatusPage
