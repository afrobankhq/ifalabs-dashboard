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
      
      // Check if user is authenticated by verifying token and fetching user data
      if (authService.isAuthenticated()) {
        console.log('[AuthContext] initializeAuth: user is authenticated, verifying token')
        const isValid = await authService.verifyToken()
        if (isValid) {
          console.log('[AuthContext] initializeAuth: token is valid, fetching user data')
          // Fetch current user from API
          const currentUser = await authService.getCurrentUser()
          console.log('[AuthContext] initializeAuth: got user data', currentUser)
          setUser(currentUser)
        } else {
          console.warn('[AuthContext] initializeAuth: token verification failed; clearing session')
          setUser(null)
        }
      } else {
        console.log('[AuthContext] initializeAuth: user is not authenticated')
        setUser(null)
      }
    } catch (error) {
      console.error('[AuthContext] initializeAuth: error', error)
      setUser(null)
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
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if API call fails
      setUser(null)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const isValid = await authService.verifyToken()
        if (isValid) {
          // Fetch current user from API
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        } else {
          console.warn('Token verification failed during refresh; clearing session')
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth refresh error:', error)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
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
