import type { EmailProvider, EmailMessage } from './index'

export class SendGridProvider implements EmailProvider {
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
        personalizations: [
          {
            to: recipients.map(email => ({ email })),
          },
        ],
        from: { email: this.from.includes('<') ? this.from.match(/<(.+)>/)?.[1] : this.from },
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
          { type: 'text/html', value: message.html },
        ],
        ...(message.replyTo && { reply_to: { email: message.replyTo } }),
        ...(message.attachments && {
          attachments: message.attachments.map(att => ({
            filename: att.filename,
            content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
            type: att.contentType || 'application/octet-stream',
          })),
        }),
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('SendGrid error:', error)
        return { success: false, error: `SendGrid error: ${response.status}` }
      }

      const messageId = response.headers.get('X-Message-Id') || undefined
      return { success: true, messageId }
    } catch (error) {
      console.error('SendGrid send error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // SendGrid doesn't have a specific test endpoint, so we verify the API key
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok) {
        return { success: true }
      }

      return { success: false, error: `Invalid API key or authentication failed: ${response.status}` }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  }
}
