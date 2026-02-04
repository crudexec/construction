import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface Vendor {
  id: string
  name: string
  companyName: string
  email: string | null
  portalEmail: string | null
  phone: string | null
  status: string
  type: string
  companyId: string
  company: {
    id: string
    name: string
    appName: string
    currency: string
  }
}

interface VendorAuthState {
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
  login: (vendor: Vendor, token: string) => void
  logout: () => void
  updateVendor: (updates: Partial<Vendor>) => void
  initializeAuth: () => void
}

export const useVendorAuthStore = create<VendorAuthState>()(
  persist(
    (set, get) => ({
      vendor: null,
      token: null,
      isAuthenticated: false,

      login: (vendor, token) => {
        Cookies.set('vendor-auth-token', token, { expires: 7 })
        set({
          vendor,
          token,
          isAuthenticated: true
        })
      },

      logout: () => {
        Cookies.remove('vendor-auth-token')
        set({
          vendor: null,
          token: null,
          isAuthenticated: false
        })
      },

      updateVendor: (updates) => {
        const currentVendor = get().vendor
        if (currentVendor) {
          set({
            vendor: { ...currentVendor, ...updates }
          })
        }
      },

      initializeAuth: () => {
        const token = Cookies.get('vendor-auth-token')
        if (token && !get().isAuthenticated) {
          // Token exists but state not initialized
          // The actual vendor data should be fetched from API
        }
      }
    }),
    {
      name: 'vendor-auth-storage',
      partialize: (state) => ({
        vendor: state.vendor,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
