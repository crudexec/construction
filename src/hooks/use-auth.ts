'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import Cookies from 'js-cookie'

export function useAuth() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore()

  useEffect(() => {
    if (token) {
      Cookies.set('auth-token', token, { expires: 7 })
    } else {
      Cookies.remove('auth-token')
    }
  }, [token])

  const loginWithToken = (userData: any, userToken: string) => {
    login(userData, userToken)
    Cookies.set('auth-token', userToken, { expires: 7 })
  }

  const logoutAndClearCookies = () => {
    logout()
    Cookies.remove('auth-token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login: loginWithToken,
    logout: logoutAndClearCookies,
  }
}