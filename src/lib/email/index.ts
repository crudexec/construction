import { prisma } from '@/lib/prisma'
import { SendGridProvider } from './sendgrid'
import { SESProvider } from './ses'
import { SMTPProvider } from './smtp'
import { ResendProvider } from './resend'

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  attachments?: {
    filename: string
    content: string | Buffer
    contentType?: string
  }[]
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>
  testConnection(): Promise<{ success: boolean; error?: string }>
}

export interface EmailConfig {
  provider: 'NONE' | 'SENDGRID' | 'AWS_SES' | 'SMTP' | 'RESEND'
  apiKey?: string | null
  fromEmail?: string | null
  fromName?: string | null
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUser?: string | null
  smtpPassword?: string | null
  smtpSecure?: boolean
}

export class EmailService {
  private provider: EmailProvider | null = null
  private config: EmailConfig | null = null

  constructor(config?: EmailConfig) {
    if (config) {
      this.setConfig(config)
    }
  }

  setConfig(config: EmailConfig): void {
    this.config = config
    this.provider = this.createProvider(config)
  }

  private createProvider(config: EmailConfig): EmailProvider | null {
    if (config.provider === 'NONE' || !config.fromEmail) {
      return null
    }

    const from = config.fromName
      ? `${config.fromName} <${config.fromEmail}>`
      : config.fromEmail

    switch (config.provider) {
      case 'SENDGRID':
        if (!config.apiKey) return null
        return new SendGridProvider(config.apiKey, from)

      case 'AWS_SES':
        if (!config.apiKey) return null
        return new SESProvider(config.apiKey, from)

      case 'SMTP':
        if (!config.smtpHost || !config.smtpPort) return null
        return new SMTPProvider({
          host: config.smtpHost,
          port: config.smtpPort,
          user: config.smtpUser || undefined,
          password: config.smtpPassword || undefined,
          secure: config.smtpSecure ?? true,
          from,
        })

      case 'RESEND':
        if (!config.apiKey) return null
        return new ResendProvider(config.apiKey, from)

      default:
        return null
    }
  }

  async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.provider) {
      return { success: false, error: 'Email provider not configured' }
    }

    return this.provider.send(message)
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.provider) {
      return { success: false, error: 'Email provider not configured' }
    }

    return this.provider.testConnection()
  }

  isConfigured(): boolean {
    return this.provider !== null
  }
}

// Factory function to get email service for a company
export async function getEmailService(companyId: string): Promise<EmailService> {
  const emailService = new EmailService()

  const config = await prisma.emailConfig.findUnique({
    where: { companyId },
  })

  if (config && config.isActive) {
    emailService.setConfig({
      provider: config.provider,
      apiKey: config.apiKey,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword,
      smtpSecure: config.smtpSecure,
    })
  }

  return emailService
}

// Send notification email helper
export async function sendNotificationEmail(
  companyId: string,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  const emailService = await getEmailService(companyId)

  if (!emailService.isConfigured()) {
    return { success: false, error: 'Email not configured for this company' }
  }

  return emailService.send({ to, subject, html, text })
}
