import type { EmailProvider, EmailMessage } from './index'

interface SMTPConfig {
  host: string
  port: number
  user?: string
  password?: string
  secure: boolean
  from: string
}

// SMTP provider stub
// To enable SMTP support, install nodemailer and implement the full provider
export class SMTPProvider implements EmailProvider {
  private config: SMTPConfig

  constructor(config: SMTPConfig) {
    this.config = config
  }

  async send(_message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // SMTP functionality requires nodemailer to be installed
    // npm install nodemailer @types/nodemailer
    // Then implement the full provider

    // For now, return an informative error
    return {
      success: false,
      error: `SMTP is not fully implemented. Configuration: ${this.config.host}:${this.config.port}. Install nodemailer to enable: npm install nodemailer`,
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // Basic validation of config
    if (!this.config.host || !this.config.port) {
      return { success: false, error: 'SMTP host and port are required' }
    }

    return {
      success: false,
      error: 'SMTP test not implemented. Install nodemailer to enable full SMTP support.',
    }
  }
}
