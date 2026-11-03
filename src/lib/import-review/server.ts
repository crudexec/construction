import { createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import type { ReviewField, ReviewOption } from './types'

export class ReviewError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export function newReviewToken() { const token = randomBytes(32).toString('hex'); return { token, tokenHash: hashToken(token) } }
export function requestOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || request.nextUrl.host
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http' ? `${forwardedProtocol}:` : request.nextUrl.protocol
  return new URL(`${protocol}//${host}`).origin
}
export function failure(error: unknown) {
  if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders })
  // Never log the request URL, token, or client corrections.
  console.error('Import review request failed', error instanceof Error ? error.name : 'unknown')
  return NextResponse.json({ error: 'Could not save or load this review. Please try again.' }, { status: 500, headers: privateHeaders })
}
export async function readBody(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== requestOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ReviewError('Open this review on the original website to save changes.', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ReviewError('Expected a JSON request.', 415)
  const reader = request.body?.getReader()
  if (!reader) throw new ReviewError('Missing request body.')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > 32768) { await reader.cancel(); throw new ReviewError('This response is too large.', 413) }
    chunks.push(value)
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body as Record<string, unknown>
  } catch { throw new ReviewError('Invalid request body.') }
}
export async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer /, '')
  const user = token ? await validateUser(token) : null
  if (!user) throw new ReviewError('Sign in to continue.', 401)
  if (user.role !== 'ADMIN') throw new ReviewError('Administrator access required.', 403)
  return user
}
export const publicRowSelect = {
  id: true, position: true, sourceFile: true, sourceRow: true, sourceId: true,
  kind: true, title: true, reason: true, context: true, fields: true,
  decision: true, values: true, notes: true, reviewer: true, revision: true, updatedAt: true,
} satisfies Prisma.AssetImportReviewRowSelect

export async function findReview(token: string, tx: Prisma.TransactionClient = prisma, lock = false) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ReviewError('This review link is expired or unavailable. Ask for a new link.', 404)
  const tokenHash = hashToken(token)
  if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM "AssetImportReview" WHERE "tokenHash"=${tokenHash} FOR UPDATE`)
  const review = await tx.assetImportReview.findUnique({ where: { tokenHash } })
  if (!review || review.revokedAt || review.expiresAt <= new Date()) throw new ReviewError('This review link is expired or unavailable. Ask for a new link.', 404)
  return review
}

// Wall-clock inputs are explicitly Pacific time, including historical DST.
export function pacificDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) throw new ReviewError('Enter a valid date and time.')
  const [, year, month, day, hour, minute] = match.map(Number)
  const utc = Date.UTC(year, month - 1, day, hour, minute)
  const d = new Date(utc)
  if (year < 1900 || year > 2100 || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day || hour > 23 || minute > 59) throw new ReviewError('Enter a valid date and time.')
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const candidates = [7, 8].map(offset => new Date(utc + offset * 3600000)).filter(candidate => {
    const p = Object.fromEntries(formatter.formatToParts(candidate).map(part => [part.type, part.value]))
    return [p.year, p.month, p.day, p.hour, p.minute].map(Number).every((v, index) => v === [year, month, day, hour, minute][index])
  })
  if (candidates.length !== 1) throw new ReviewError('This Pacific time is ambiguous or does not exist because of daylight saving. Please clarify it in a question.')
  return candidates[0].toISOString()
}

export function validateAnswer(body: Record<string, unknown>, fields: ReviewField[], choices: Record<string, ReviewOption[]>) {
  const { decision, values, reviewer, notes } = body
  if (!['resolve', 'exclude', 'question'].includes(String(decision))) throw new ReviewError('Choose how to handle this row.')
  if (typeof reviewer !== 'string' || !reviewer.trim() || reviewer.trim().length > 100) throw new ReviewError('Enter your name (up to 100 characters).')
  if (typeof notes !== 'string' || notes.length > 2000) throw new ReviewError('Notes must be 2,000 characters or fewer.')
  if (decision !== 'resolve' && !notes.trim()) throw new ReviewError('Add a reason or question so we can finalize this row.')
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new ReviewError('Invalid correction values.')
  const input = values as Record<string, unknown>
  if (Object.keys(input).some(key => !fields.some(field => field.key === key))) throw new ReviewError('Unknown correction field.')
  const clean: Record<string, string> = {}
  for (const field of fields) {
    const value = input[field.key] ?? ''
    if (typeof value !== 'string' || value.length > 1000) throw new ReviewError(`${field.label} must be 1,000 characters or fewer.`)
    clean[field.key] = value.trim()
    if (decision !== 'resolve') continue
    if (field.required && (!value.trim() || (field.type === 'checkbox' && value !== 'true'))) throw new ReviewError(`${field.label} is required.`)
    if (!value.trim()) continue
    if (field.type === 'number' && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 1e12)) throw new ReviewError(`${field.label} must be a non-negative number with at most two decimal places.`)
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ReviewError('Enter a valid email address.')
    if (field.type === 'datetime-local') pacificDate(value)
    if (field.type === 'checkbox' && !['true', 'false'].includes(value)) throw new ReviewError(`Invalid ${field.label}.`)
    if (field.type === 'select' && !(field.options ?? choices[field.choiceKey || ''] ?? []).some(option => option.value === value)) throw new ReviewError(`Choose a valid ${field.label}.`)
  }
  if (decision === 'resolve') {
    if (clean.startedAt && clean.endedAt && pacificDate(clean.endedAt) < pacificDate(clean.startedAt)) throw new ReviewError('The end date must be on or after the start date.')
    if (clean.serviceHandling === 'link' && !clean.workOrderId) throw new ReviewError('Choose the related work order.')
    if (clean.serviceHandling === 'standalone' && clean.workOrderId) throw new ReviewError('Clear the work order for a separate service entry.')
  }
  return { decision: decision as string, values: clean, notes: notes.trim(), reviewer: reviewer.trim() }
}
