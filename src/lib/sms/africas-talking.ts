import type { SMSProvider, SMSMessage, SMSResult } from './index'

/**
 * Africa's Talking SMS Provider
 * API Documentation: https://developers.africastalking.com/docs/sms/sending
 */
export class AfricasTalkingProvider implements SMSProvider {
  private username: string
  private apiKey: string
  private shortCode?: string
  private baseUrl: string

  constructor(username: string, apiKey: string, shortCode?: string) {
    this.username = username
    this.apiKey = apiKey
    this.shortCode = shortCode
    // Use sandbox for testing, production for live
    this.baseUrl = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1'
      : 'https://api.africastalking.com/version1'
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    try {
      const recipients = Array.isArray(message.to)
        ? message.to.join(',')
        : message.to

      const body = new URLSearchParams({
        username: this.username,
        to: recipients,
        message: message.message,
      })

      // Add sender ID if configured
      if (this.shortCode) {
        body.append('from', this.shortCode)
      }

      // Add enqueue flag if specified
      if (message.enqueue) {
        body.append('enqueue', '1')
      }

      const response = await fetch(`${this.baseUrl}/messaging`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey,
        },
        body: body.toString(),
      })

      const data = await response.json() as AfricasTalkingResponse

      if (!response.ok) {
        return {
          success: false,
          error: data.SMSMessageData?.Message || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      // Parse the response
      const smsData = data.SMSMessageData
      const messageRecipients = smsData?.Recipients || []

      // Check if all messages were sent successfully
      const allSuccess = messageRecipients.every(
        (r) => r.status === 'Success' || r.statusCode === 101
      )

      // Calculate total cost
      const totalCost = messageRecipients.reduce((sum, r) => {
        const cost = parseFloat(r.cost?.replace(/[^0-9.]/g, '') || '0')
        return sum + cost
      }, 0)

      return {
        success: allSuccess,
        messageId: messageRecipients[0]?.messageId,
        cost: totalCost,
        recipients: messageRecipients.map((r) => ({
          number: r.number,
          status: r.status,
          messageId: r.messageId,
          cost: parseFloat(r.cost?.replace(/[^0-9.]/g, '') || '0'),
        })),
        error: allSuccess ? undefined : smsData?.Message,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return {
        success: false,
        error: `Failed to send SMS: ${errorMessage}`,
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use the user data endpoint to verify credentials
      const response = await fetch(
        `${this.baseUrl}/user?username=${encodeURIComponent(this.username)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'apiKey': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        return {
          success: false,
          error: data.errorMessage || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json() as AfricasTalkingUserResponse

      if (data.UserData?.balance) {
        return { success: true }
      }

      return {
        success: false,
        error: 'Unable to verify account credentials',
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`,
      }
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string } | { error: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/user?username=${encodeURIComponent(this.username)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'apiKey': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        return {
          error: data.errorMessage || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json() as AfricasTalkingUserResponse

      if (data.UserData?.balance) {
        // Parse balance string like "NGN 1234.56" or "KES 100.00"
        const balanceStr = data.UserData.balance
        const match = balanceStr.match(/([A-Z]{3})\s*([\d.]+)/)

        if (match) {
          return {
            currency: match[1],
            balance: parseFloat(match[2]),
          }
        }
      }

      return { error: 'Unable to parse balance' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return { error: `Failed to get balance: ${errorMessage}` }
    }
  }
}

// Type definitions for Africa's Talking API responses
interface AfricasTalkingResponse {
  SMSMessageData: {
    Message: string
    Recipients: Array<{
      statusCode: number
      number: string
      status: string
      cost: string
      messageId: string
    }>
  }
}

interface AfricasTalkingUserResponse {
  UserData: {
    balance: string
  }
}
