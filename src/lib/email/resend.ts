import type { EmailProvider, EmailMessage } from './index'

export class ResendProvider implements EmailProvider {
  private apiKey: string
  private from: string

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey
    this.from = from
  }

  async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(message.to) ? message.to : [message.to]

      const payload = {
        from: this.from,
        to: recipients,
        subject: message.subject,
        html: message.html,
        ...(message.text && { text: message.text }),
        ...(message.replyTo && { reply_to: message.replyTo }),
        ...(message.attachments && {
          attachments: message.attachments.map(att => ({
            filename: att.filename,
            content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          })),
        }),
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Resend error:', data)
        return { success: false, error: data.message || `Resend error: ${response.status}` }
      }

      return { success: true, messageId: data.id }
    } catch (error) {
      console.error('Resend send error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Resend has an API key validation endpoint
      const response = await fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok) {
        return { success: true }
      }

      const data = await response.json()
      return { success: false, error: data.message || `Invalid API key: ${response.status}` }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  }
}
