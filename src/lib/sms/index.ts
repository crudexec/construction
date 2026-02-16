import { prisma } from '@/lib/prisma'
import { AfricasTalkingProvider } from './africas-talking'

export interface SMSMessage {
  to: string | string[]  // Phone number(s) in E.164 format (e.g., +2348012345678)
  message: string        // Plain text message (160 chars for single SMS, longer will be split)
  enqueue?: boolean      // Queue for later delivery (optional)
}

export interface SMSResult {
  success: boolean
  messageId?: string
  cost?: number
  error?: string
  recipients?: {
    number: string
    status: string
    messageId?: string
    cost?: number
  }[]
}

export interface SMSProvider {
  send(message: SMSMessage): Promise<SMSResult>
  testConnection(): Promise<{ success: boolean; error?: string }>
  getBalance?(): Promise<{ balance: number; currency: string } | { error: string }>
}

export interface SMSConfig {
  provider: 'NONE' | 'AFRICAS_TALKING'
  apiKey?: string | null
  username?: string | null
  shortCode?: string | null
}

export class SMSService {
  private provider: SMSProvider | null = null
  private config: SMSConfig | null = null

  constructor(config?: SMSConfig) {
    if (config) {
      this.setConfig(config)
    }
  }

  setConfig(config: SMSConfig): void {
    this.config = config
    this.provider = this.createProvider(config)
  }

  private createProvider(config: SMSConfig): SMSProvider | null {
    if (config.provider === 'NONE') {
      return null
    }

    switch (config.provider) {
      case 'AFRICAS_TALKING':
        if (!config.apiKey || !config.username) return null
        return new AfricasTalkingProvider(
          config.username,
          config.apiKey,
          config.shortCode || undefined
        )

      default:
        return null
    }
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    if (!this.provider) {
      return { success: false, error: 'SMS provider not configured' }
    }

    // Normalize phone numbers
    const normalizedMessage = {
      ...message,
      to: Array.isArray(message.to)
        ? message.to.map(normalizePhoneNumber)
        : normalizePhoneNumber(message.to),
    }

    return this.provider.send(normalizedMessage)
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.provider) {
      return { success: false, error: 'SMS provider not configured' }
    }

    return this.provider.testConnection()
  }

  async getBalance(): Promise<{ balance: number; currency: string } | { error: string }> {
    if (!this.provider) {
      return { error: 'SMS provider not configured' }
    }

    if (!this.provider.getBalance) {
      return { error: 'Balance check not supported by this provider' }
    }

    return this.provider.getBalance()
  }

  isConfigured(): boolean {
    return this.provider !== null
  }
}

/**
 * Normalize phone number to E.164 format
 * Handles Nigerian numbers specifically
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle Nigerian numbers
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Nigerian local format: 08012345678 -> +2348012345678
    cleaned = '+234' + cleaned.substring(1)
  } else if (cleaned.startsWith('234') && cleaned.length === 13) {
    // Nigerian without +: 2348012345678 -> +2348012345678
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    // Assume Nigerian if no country code and valid length
    if (cleaned.startsWith('8') || cleaned.startsWith('7') || cleaned.startsWith('9')) {
      cleaned = '+234' + cleaned
    }
  }

  return cleaned
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  // Basic E.164 validation: + followed by 10-15 digits
  return /^\+[1-9]\d{9,14}$/.test(normalized)
}

/**
 * Factory function to get SMS service for a company
 */
export async function getSMSService(companyId: string): Promise<SMSService> {
  const smsService = new SMSService()

  const config = await prisma.sMSConfig.findUnique({
    where: { companyId },
  })

  if (config && config.isActive) {
    smsService.setConfig({
      provider: config.provider,
      apiKey: config.apiKey,
      username: config.username,
      shortCode: config.shortCode,
    })
  }

  return smsService
}

/**
 * Send notification SMS helper
 */
export async function sendNotificationSMS(
  companyId: string,
  to: string,
  message: string
): Promise<SMSResult> {
  const smsService = await getSMSService(companyId)

  if (!smsService.isConfigured()) {
    return { success: false, error: 'SMS not configured for this company' }
  }

  return smsService.send({ to, message })
}

/**
 * Check if SMS is within quiet hours
 * @param quietStart - Hour to start quiet period (0-23)
 * @param quietEnd - Hour to end quiet period (0-23)
 * @param timezone - Timezone offset in hours (e.g., +1 for WAT)
 */
export function isWithinQuietHours(
  quietStart: number | null,
  quietEnd: number | null,
  timezone: number = 1 // Default to WAT (UTC+1)
): boolean {
  if (quietStart === null || quietEnd === null) {
    return false
  }

  const now = new Date()
  const currentHour = (now.getUTCHours() + timezone) % 24

  if (quietStart < quietEnd) {
    // Simple case: quiet hours don't span midnight
    return currentHour >= quietStart && currentHour < quietEnd
  } else {
    // Quiet hours span midnight (e.g., 22:00 to 07:00)
    return currentHour >= quietStart || currentHour < quietEnd
  }
}
