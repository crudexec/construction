'use client'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck } from 'lucide-react'
import { control, primary, Field, ErrorMessage, usePlatformMutation } from './shared'

export function SecurityGate({ enrolled }: { enrolled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const mutation = usePlatformMutation<{ secret?: string; uri?: string; verified?: boolean }>('/api/platform/security')
  const verifying = enrolled || !!setup
  return <section aria-labelledby="platform-security-heading" className="mx-auto my-8 max-w-lg rounded-xl border border-gray-200 bg-white p-6 sm:p-8"><ShieldCheck className="mb-4 h-7 w-7 text-primary-600" /><h2 id="platform-security-heading" className="text-xl font-semibold">{verifying ? 'Verify your authenticator' : 'Protect platform access'}</h2><p className="mt-3 text-sm leading-6 text-gray-600">{enrolled ? 'Enter the six-digit code from your authenticator app. This unlocks platform administration for two hours.' : setup ? 'Scan this code with your authenticator app, then enter its six-digit code to finish setup.' : 'Platform administration can manage every company. Confirm your password to set up two-factor authentication.'}</p>
    {setup && <div className="my-5 space-y-3"><QRCodeSVG value={setup.uri} size={184} title="Buildflo authenticator setup" /><details className="text-sm"><summary className="min-h-11 cursor-pointer py-3 text-primary-700">Enter a setup key instead</summary><p className="break-all rounded bg-gray-50 p-3 font-mono">{setup.secret}</p></details></div>}
    <form key={String(verifying)} className="mt-5 space-y-4" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget, data = new FormData(form); try { const result = await mutation.mutateAsync(verifying ? { action: 'verify', code: data.get('code') } : { action: 'setup', password: data.get('password') }); form.reset(); if (result.secret && result.uri) setSetup({ secret: result.secret, uri: result.uri }); if (result.verified) setSetup(null) } catch {} }}>
      {verifying ? <Field label="Authenticator code"><input autoFocus required className={control} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" disabled={mutation.isPending} /></Field> : <Field label="Current password"><input required className={control} name="password" type="password" autoComplete="current-password" disabled={mutation.isPending} /></Field>}
      <ErrorMessage error={mutation.error} /><button className={`${primary} w-full`} disabled={mutation.isPending}>{mutation.isPending ? 'Verifying…' : verifying ? 'Unlock platform administration' : 'Set up authenticator'}</button>
    </form><p className="mt-5 text-xs leading-5 text-gray-600">If you lose access to your authenticator, a server administrator must verify your identity and reset enrollment.</p>
  </section>
}
