export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined
}

export function baseTemplate(content: string, companyName: string = 'BuildFlo'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .email-header {
      background-color: #4f46e5;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 32px 24px;
    }
    .email-footer {
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .btn:hover {
      background-color: #4338ca;
    }
    .btn-secondary {
      background-color: #6b7280;
    }
    .btn-danger {
      background-color: #dc2626;
    }
    .btn-success {
      background-color: #059669;
    }
    .alert {
      padding: 16px;
      border-radius: 6px;
      margin: 16px 0;
    }
    .alert-info {
      background-color: #dbeafe;
      border: 1px solid #93c5fd;
      color: #1e40af;
    }
    .alert-warning {
      background-color: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
    }
    .alert-danger {
      background-color: #fee2e2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }
    .alert-success {
      background-color: #d1fae5;
      border: 1px solid #6ee7b7;
      color: #065f46;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      font-weight: 500;
    }
    h2 {
      color: #111827;
      font-size: 20px;
      margin-bottom: 16px;
    }
    p {
      margin: 12px 0;
    }
    a {
      color: #4f46e5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="email-header">
        <h1>${companyName}</h1>
      </div>
      <div class="email-body">
        ${content}
      </div>
      <div class="email-footer">
        <p>This email was sent by ${companyName}</p>
        <p>You're receiving this because you're part of a ${companyName} workspace.</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

export function replaceVariables(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() ?? match
  })
}
