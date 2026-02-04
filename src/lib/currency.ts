// Currency configuration and formatting utilities

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  locale: string
  decimals: number
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG', decimals: 2 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE', decimals: 2 },
}

/**
 * Format a number as currency based on the currency code
 * @param amount - The numeric amount to format
 * @param currencyCode - The ISO currency code (e.g., 'USD', 'NGN', 'KES')
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = 'USD',
  options?: {
    showDecimals?: boolean
    compact?: boolean
  }
): string {
  if (amount === null || amount === undefined) {
    amount = 0
  }

  const config = CURRENCIES[currencyCode] || CURRENCIES.USD

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: options?.showDecimals === false ? 0 : config.decimals,
      maximumFractionDigits: options?.showDecimals === false ? 0 : config.decimals,
    }

    if (options?.compact) {
      formatOptions.notation = 'compact'
      formatOptions.compactDisplay = 'short'
    }

    return new Intl.NumberFormat(config.locale, formatOptions).format(amount)
  } catch {
    // Fallback formatting if Intl fails
    return `${config.symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    })}`
  }
}

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode - The ISO currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  return CURRENCIES[currencyCode]?.symbol || '$'
}

/**
 * Get the full currency configuration
 * @param currencyCode - The ISO currency code
 * @returns The currency configuration object
 */
export function getCurrencyConfig(currencyCode: string = 'USD'): CurrencyConfig {
  return CURRENCIES[currencyCode] || CURRENCIES.USD
}

/**
 * Get all available currencies as an array
 * @returns Array of currency configurations
 */
export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES)
}
