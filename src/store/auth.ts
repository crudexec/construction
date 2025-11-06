import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Company, Role } from '@prisma/client'
import Cookies from 'js-cookie'

interface AuthUser extends Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry'> {
  company: Company
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
        Cookies.set('auth-token', token, { expires: 7 })
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        Cookies.remove('auth-token')
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      initializeAuth: () => {
        const token = Cookies.get('auth-token')
        if (token) {
          set({ token, isAuthenticated: true })
        } else {
          set({ token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)