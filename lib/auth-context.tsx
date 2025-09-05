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
      
      // Check if user is already logged in
      const currentUser = authService.getCurrentUser()
      if (currentUser && authService.isAuthenticated()) {
        // If verify path isn't configured, trust local token
        const hasVerify = !!process.env.NEXT_PUBLIC_AUTH_VERIFY_PATH
        let isValid = true
        if (hasVerify) {
          isValid = await authService.verifyToken()
        }
        if (isValid) setUser(currentUser)
        else {
          console.warn('Token verification failed; preserving session')
          setUser(currentUser)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
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
      const currentUser = authService.getCurrentUser()
      if (currentUser && authService.isAuthenticated()) {
        const isValid = await authService.verifyToken()
        if (isValid) {
          setUser(currentUser)
        } else {
          console.warn('Token verification failed during refresh; preserving session')
          setUser(currentUser)
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
