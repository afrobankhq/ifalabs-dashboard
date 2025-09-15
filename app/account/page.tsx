"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Shield, Bell, Trash2, Camera, Save, AlertTriangle, Edit, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

interface CompanyProfile {
  id: string
  name: string
  email: string
  first_name: string
  last_name: string
  description: string
  website: string
  logo_url: string
  subscription_plan: string
  created_at: string
  updated_at: string
}

interface UpdateProfileRequest {
  name: string
  first_name: string
  last_name: string
  description: string
  website: string
  logo_url: string
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  securityAlerts: boolean
  weeklyReports: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  lastPasswordChange: string
  activeSessions: number
}

export default function AccountPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [editProfile, setEditProfile] = useState<UpdateProfileRequest>({
    name: "",
    first_name: "",
    last_name: "",
    description: "",
    website: "",
    logo_url: "",
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    securityAlerts: true,
    weeklyReports: true,
  })

  const [security] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    lastPasswordChange: "2024-01-15",
    activeSessions: 3,
  })

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const profileData = await executeApiCall(() => apiService.getCompanyProfile(user!.id))
      if (profileData && typeof profileData === 'object') {
        const profileResponse = profileData as CompanyProfile
        setProfile(profileResponse)
        // Initialize edit form with current data
        setEditProfile({
          name: profileResponse.name || "",
          first_name: profileResponse.first_name || "",
          last_name: profileResponse.last_name || "",
          description: profileResponse.description || "",
          website: profileResponse.website || "",
          logo_url: profileResponse.logo_url || "",
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      toast({
        title: "Error",
        description: "Failed to load profile information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    if (!user || !profile) return

    try {
      const updatedProfile = await executeApiCall(() => 
        apiService.updateCompanyProfile(user.id, editProfile)
      )
      
      if (updatedProfile && typeof updatedProfile === 'object') {
        setProfile(updatedProfile as CompanyProfile)
        setIsEditDialogOpen(false)
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
        })
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditProfile = () => {
    if (profile) {
      setEditProfile({
        name: profile.name || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        description: profile.description || "",
        website: profile.website || "",
        logo_url: profile.logo_url || "",
      })
      setIsEditDialogOpen(true)
    }
  }

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }

    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    })
  }

  const handleNotificationUpdate = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications({ ...notifications, [key]: value })
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    })
  }

  const handleAccountDeletion = () => {
    toast({
      title: "Account Deletion Requested",
      description: "We'll send you an email with instructions to confirm account deletion.",
      variant: "destructive",
    })
    setIsDeleteDialogOpen(false)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground">Unable to load your profile information.</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
    <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences.</p>
        </div>
        <Button onClick={handleEditProfile}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information and profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.logo_url || "/placeholder.svg"} alt={profile.name} />
                <AvatarFallback>
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <Badge variant="outline" className="mt-1">
                  {profile.subscription_plan || 'Free'} Plan
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <p className="text-sm font-medium">{profile.name || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <p className="text-sm font-medium">{profile.email || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <p className="text-sm font-medium">{profile.first_name || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <p className="text-sm font-medium">{profile.last_name || 'Not set'}</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Website</Label>
                <p className="text-sm font-medium">
                  {profile.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {profile.website}
                    </a>
                  ) : (
                    'Not set'
                  )}
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">
                  {profile.description || 'No description provided'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security and authentication settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={security.twoFactorEnabled ? "default" : "secondary"}>
                    {security.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {security.twoFactorEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Last Password Change</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(security.lastPasswordChange).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground">{security.activeSessions} devices</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Change Password</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={!currentPassword || !newPassword || !confirmPassword}>
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you want to receive notifications and updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationUpdate("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationUpdate("pushNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) => handleNotificationUpdate("marketingEmails", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">Important security notifications (recommended)</p>
                </div>
                <Switch
                  checked={notifications.securityAlerts}
                  onCheckedChange={(checked) => handleNotificationUpdate("securityAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Weekly summary of your account activity</p>
                </div>
                <Switch
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => handleNotificationUpdate("weeklyReports", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible and destructive actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data
                      from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleAccountDeletion}>
                      Yes, delete my account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your company profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Company Name</Label>
                <Input
                  id="edit-name"
                  value={editProfile.name}
                  onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-logo">Logo URL</Label>
                <Input
                  id="edit-logo"
                  type="url"
                  value={editProfile.logo_url}
                  onChange={(e) => setEditProfile({ ...editProfile, logo_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editProfile.first_name}
                  onChange={(e) => setEditProfile({ ...editProfile, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editProfile.last_name}
                  onChange={(e) => setEditProfile({ ...editProfile, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  value={editProfile.website}
                  onChange={(e) => setEditProfile({ ...editProfile, website: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Tell us about your company..."
                  value={editProfile.description}
                  onChange={(e) => setEditProfile({ ...editProfile, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProfileUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}