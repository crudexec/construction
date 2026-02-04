'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { formatCurrency, getCurrencySymbol, getCurrencyConfig, CurrencyConfig } from '@/lib/currency'

interface UseCurrencyReturn {
  currency: string
  currencyConfig: CurrencyConfig
  symbol: string
  format: (amount: number | null | undefined, options?: { showDecimals?: boolean; compact?: boolean }) => string
}

/**
 * Hook to access currency formatting based on the company's currency setting
 * @returns Currency formatting utilities bound to the company's currency
 */
export function useCurrency(): UseCurrencyReturn {
  const user = useAuthStore((state) => state.user)
  const currencyCode = user?.company?.currency || 'USD'

  const format = useCallback(
    (amount: number | null | undefined, options?: { showDecimals?: boolean; compact?: boolean }) => {
      return formatCurrency(amount, currencyCode, options)
    },
    [currencyCode]
  )

  return {
    currency: currencyCode,
    currencyConfig: getCurrencyConfig(currencyCode),
    symbol: getCurrencySymbol(currencyCode),
    format,
  }
}
