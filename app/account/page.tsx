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
import { User, Shield, Bell, Trash2, Camera, Save, AlertTriangle, Edit, Loader2, Upload, X } from "lucide-react"
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
  logo_url?: string
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  // Listen for profile updates from other pages
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Account - Profile updated event received:', event.detail)
      if (event.detail?.profile) {
        const profileResponse = event.detail.profile as CompanyProfile
        setProfile(profileResponse)
        // Update edit form with new data
        setEditProfile({
          name: profileResponse.name || "",
          first_name: profileResponse.first_name || "",
          last_name: profileResponse.last_name || "",
          description: profileResponse.description || "",
          website: profileResponse.website || "",
          logo_url: profileResponse.logo_url || "",
        })
        console.log('Account - Profile updated from event')
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user_profile' && event.newValue) {
        console.log('Account - User profile updated in localStorage')
        try {
          const updatedProfile = JSON.parse(event.newValue) as CompanyProfile
          setProfile(updatedProfile)
          // Update edit form with new data
          setEditProfile({
            name: updatedProfile.name || "",
            first_name: updatedProfile.first_name || "",
            last_name: updatedProfile.last_name || "",
            description: updatedProfile.description || "",
            website: updatedProfile.website || "",
            logo_url: updatedProfile.logo_url || "",
          })
          console.log('Account - Profile updated from localStorage')
        } catch (err) {
          console.error('Account - Failed to parse updated profile from localStorage:', err)
        }
      }
    }

    // Check for recent profile updates
    const checkRecentProfileUpdate = () => {
      const lastUpdate = localStorage.getItem('profile_updated_timestamp')
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate)
        const now = Date.now()
        if (now - updateTime < 30000) { // 30 seconds
          console.log('Account - Recent profile update detected, reloading profile')
          loadProfile()
        }
      }
    }

    checkRecentProfileUpdate()

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
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

    // Validate logo URL if provided
    if (editProfile.logo_url && editProfile.logo_url.trim() !== '') {
      try {
        new URL(editProfile.logo_url)
      } catch {
        toast({
          title: "Invalid Logo URL",
          description: "Please enter a valid URL for the logo or leave it empty.",
          variant: "destructive",
        })
        return
      }
    }

    // Prepare the update payload, omitting empty logo_url
    let updatePayload: UpdateProfileRequest
    if (!editProfile.logo_url || editProfile.logo_url.trim() === '') {
      const { logo_url, ...payloadWithoutLogo } = editProfile
      updatePayload = payloadWithoutLogo
    } else {
      updatePayload = { ...editProfile }
    }

    try {
      const updatedProfile = await executeApiCall(() => 
        apiService.updateCompanyProfile(user.id, updatePayload)
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
      setImagePreview(profile.logo_url || null)
      setIsEditDialogOpen(true)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 10MB.",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const data = await response.json()
      
      // Update the logo_url in editProfile state
      setEditProfile({
        ...editProfile,
        logo_url: data.url,
      })

      toast({
        title: "Image Uploaded",
        description: "Your logo has been uploaded successfully.",
      })
    } catch (err) {
      console.error('Failed to upload image:', err)
      setImagePreview(null)
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingImage(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setEditProfile({
      ...editProfile,
      logo_url: "",
    })
  }

  const handlePasswordChange = async () => {
    if (!user) return

    // Validate passwords
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

    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required.",
        variant: "destructive",
      })
      return
    }

    try {
      await executeApiCall(() => 
        apiService.changePassword(user.id, currentPassword, newPassword)
      )
      
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      })
    } catch (err) {
      console.error('Failed to change password:', err)
      const errorMessage = err instanceof Error ? err.message : "Failed to change password. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleNotificationUpdate = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications({ ...notifications, [key]: value })
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    })
  }

  const handleAccountDeletion = async () => {
    if (!user) return

    setIsDeletingAccount(true)
    
    try {
      // Call the delete account API
      console.log('[Account] Attempting to delete account for user:', user.id)
      await executeApiCall(() => apiService.deleteCompanyAccount(user.id))
      console.log('[Account] Account deletion successful')
      
      // Close dialog immediately
      setIsDeleteDialogOpen(false)
      
      // Show success message
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. Redirecting to login...",
      })
      
      // Immediately logout and clear all data
      console.log('[Account] Clearing all data and logging out')
      
      // Call logout first (this will clear tokens properly)
      try {
        await logout()
      } catch (logoutErr) {
        console.error('[Account] Logout error:', logoutErr)
      }
      
      // Clear all localStorage as backup
      localStorage.clear()
      
      // Force redirect to login page
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
      
    } catch (err) {
      console.error('[Account] Failed to delete account:', err)
      
      toast({
        title: "Deletion Failed",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      })
      
      setIsDeletingAccount(false)
      setIsDeleteDialogOpen(false)
    }
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
            <CardDescription>Manage your password and security settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                    />
                  </div>
                  <Button 
                    onClick={handlePasswordChange} 
                    disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
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
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                      disabled={isDeletingAccount}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleAccountDeletion}
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, delete my account"
                      )}
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
            </div>
            
            {/* Logo Upload Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Logo preview"
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={isUploadingImage}
                    className="w-full"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {imagePreview ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPEG, PNG, GIF, or WebP. Max 10MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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