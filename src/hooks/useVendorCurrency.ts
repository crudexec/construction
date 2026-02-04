'use client'

import { useCallback, useEffect } from 'react'
import { useVendorAuthStore } from '@/store/vendor-auth'
import { formatCurrency, getCurrencySymbol, getCurrencyConfig, CurrencyConfig } from '@/lib/currency'

interface UseVendorCurrencyReturn {
  currency: string
  currencyConfig: CurrencyConfig
  symbol: string
  format: (amount: number | null | undefined, options?: { showDecimals?: boolean; compact?: boolean }) => string
}

/**
 * Hook to access currency formatting based on the contractor company's currency setting
 * For use in the vendor portal - always uses the currency set by the company account (contractor)
 * @returns Currency formatting utilities bound to the contractor company's currency
 */
export function useVendorCurrency(): UseVendorCurrencyReturn {
  const vendor = useVendorAuthStore((state) => state.vendor)

  // Always use the contractor company's currency (the company that hired the vendor)
  // This ensures contracts and payments are displayed in the contractor's currency
  const currencyCode = vendor?.company?.currency || 'USD'

  // Log warning if company currency is not available (for debugging)
  useEffect(() => {
    if (!vendor?.company?.currency) {
      console.warn('[useVendorCurrency] Company currency not found in vendor data, falling back to USD')
      console.debug('[useVendorCurrency] Vendor data:', vendor)
    }
  }, [vendor])

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
