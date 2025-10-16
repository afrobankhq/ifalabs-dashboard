"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, AuthUser, LoginCredentials, SignupData } from './auth'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  initiateEmailVerification: (email: string) => Promise<{ message: string }>
  verifyEmailToken: (token: string) => Promise<{ valid: boolean; email?: string }>
  completeRegistration: (data: {
    token: string
    name: string
    firstName: string
    lastName: string
    password: string
    description?: string
    website?: string
  }) => Promise<{ id: string; email: string; message: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setIsLoading(true)
      console.log('[AuthContext] initializeAuth: starting')
      
      // Check if user is authenticated by checking for token
      if (authService.isAuthenticated()) {
        console.log('[AuthContext] initializeAuth: user has token')
        
        // Try to get cached user data from localStorage first
        const cachedUserData = typeof window !== 'undefined' 
          ? localStorage.getItem('cached_user_data') 
          : null
        
        if (cachedUserData) {
          try {
            const parsedUser = JSON.parse(cachedUserData)
            console.log('[AuthContext] initializeAuth: using cached user data', parsedUser)
            setUser(parsedUser)
            setIsLoading(false)
            
            // Verify token in background (don't await)
            authService.verifyToken().then(isValid => {
              if (!isValid) {
                console.warn('[AuthContext] Background token verification failed')
                // Only logout if we can't get fresh user data
                authService.getCurrentUser().then(freshUser => {
                  if (freshUser) {
                    setUser(freshUser)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('cached_user_data', JSON.stringify(freshUser))
                    }
                  } else {
                    // Token is truly invalid
                    console.warn('[AuthContext] Token is invalid, logging out')
                    setUser(null)
                  }
                }).catch(() => {
                  // Network error - keep user logged in with cached data
                  console.warn('[AuthContext] Network error during background refresh, keeping cached user')
                })
              }
            }).catch((error) => {
              // Network error during verification - keep user logged in
              console.warn('[AuthContext] Network error during token verification, keeping user logged in', error)
            })
            
            return
          } catch (e) {
            console.warn('[AuthContext] Failed to parse cached user data', e)
          }
        }
        
        // No cached data - need to fetch user
        try {
          console.log('[AuthContext] initializeAuth: fetching user data')
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            console.log('[AuthContext] initializeAuth: got user data', currentUser)
            setUser(currentUser)
            // Cache user data
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_user_data', JSON.stringify(currentUser))
            }
          } else {
            console.warn('[AuthContext] initializeAuth: no user data returned')
            setUser(null)
          }
        } catch (error) {
          console.error('[AuthContext] initializeAuth: error fetching user', error)
          // Network error - if we have a token, keep user in a partial auth state
          // This prevents logout on network issues
          console.warn('[AuthContext] Keeping user in partial auth state due to network error')
          setUser(null)
        }
      } else {
        console.log('[AuthContext] initializeAuth: user is not authenticated')
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cached_user_data')
        }
      }
    } catch (error) {
      console.error('[AuthContext] initializeAuth: error', error)
      // Don't clear user on error - network issues shouldn't log users out
      console.warn('[AuthContext] initializeAuth: keeping auth state on error')
    } finally {
      setIsLoading(false)
      console.log('[AuthContext] initializeAuth: completed')
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await authService.login(credentials)
      setUser(response.user)
      // Cache user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_user_data', JSON.stringify(response.user))
      }
      router.push('/dashboard')
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (data: SignupData) => {
    try {
      setIsLoading(true)
      const response = await authService.signup(data)
      setUser(response.user)
      // Cache user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_user_data', JSON.stringify(response.user))
      }
      router.push('/dashboard')
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await authService.logout()
      setUser(null)
      // Clear cached user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_user_data')
      }
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if API call fails
      setUser(null)
      // Clear cached user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cached_user_data')
      }
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const initiateEmailVerification = async (email: string) => {
    return await authService.initiateEmailVerification(email)
  }

  const verifyEmailToken = async (token: string) => {
    return await authService.verifyEmailToken(token)
  }

  const completeRegistration = async (data: {
    token: string
    name: string
    firstName: string
    lastName: string
    password: string
    description?: string
    website?: string
  }) => {
    return await authService.completeRegistration(data)
  }

  const refreshAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        // Try to fetch fresh user data without strict verification
        try {
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
            // Update cached user data
            if (typeof window !== 'undefined') {
              localStorage.setItem('cached_user_data', JSON.stringify(currentUser))
            }
          } else {
            console.warn('No user data returned during refresh')
            // Keep existing user state - don't logout on network error
          }
        } catch (error) {
          console.error('Auth refresh error:', error)
          // Keep existing user state - don't logout on network error
          console.warn('Keeping existing user state due to refresh error')
        }
      } else {
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cached_user_data')
        }
      }
    } catch (error) {
      console.error('Auth refresh error:', error)
      // Keep existing user state
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    initiateEmailVerification,
    verifyEmailToken,
    completeRegistration,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login')
      }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}
