/** Contract dates are calendar dates; avoid browser timezone/DST shifts. */
export function contractDate(value?: string | Date | null) {
  return value ? (value instanceof Date ? value.toISOString() : value).slice(0, 10) : ''
}

/** Elapsed calendar days, end minus start (same-day contract = zero days). */
export function contractDuration(start: string, end?: string | null) {
  if (!start || !end) return null
  const days = (Date.parse(contractDate(end)) - Date.parse(contractDate(start))) / 86400000
  return Number.isFinite(days) && days >= 0 ? days : null
}

export function parseContractDetails(body: Record<string, unknown>, existing: { startDate: Date; endDate: Date | null }) {
  const data: Record<string, string | number | boolean | Date | null> = {}
  for (const key of ['contractNumber', 'estimateReference', 'title', 'description', 'terms', 'notes', 'retentionBond']) {
    if (!(key in body)) continue
    const value = body[key]
    if (value !== null && typeof value !== 'string') throw new Error(`${key} must be text`)
    const text = typeof value === 'string' ? value.trim() : ''
    if (key === 'contractNumber' && !text) throw new Error('Contract number is required')
    if (text.length > (['contractNumber', 'estimateReference', 'title'].includes(key) ? 200 : 20000)) throw new Error(`${key} is too long`)
    data[key] = text || null
  }
  for (const [key, max, nullable] of [['totalSum', 1e12, false], ['estimateAmount', 1e12, true], ['retentionPercent', 100, true], ['retentionAmount', 1e12, true], ['warrantyYears', 10, false]] as const) {
    if (!(key in body)) continue
    const value = body[key]
    if (value === null && nullable) { data[key] = null; continue }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(`Invalid ${key}`)
    if (key === 'warrantyYears' && (!Number.isInteger(value) || value < 1)) throw new Error('Warranty years must be between 1 and 10')
    data[key] = value
    if (key === 'totalSum') data.originalValueIsManual = true
  }
  for (const key of ['startDate', 'endDate'] as const) {
    if (!(key in body)) continue
    const value = body[key]
    if (key === 'endDate' && value === null) { data[key] = null; continue }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${key}; use YYYY-MM-DD`)
    data[key] = new Date(`${value}T00:00:00.000Z`)
  }
  const start = data.startDate instanceof Date ? data.startDate : existing.startDate
  const end = 'endDate' in data ? data.endDate : existing.endDate
  if (end instanceof Date && contractDate(end) < contractDate(start)) throw new Error('End date cannot be before start date')
  for (const [key, values] of [['type', ['LUMP_SUM', 'REMEASURABLE', 'ADDENDUM']], ['status', ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED']]] as const) {
    if (!(key in body)) continue
    if (typeof body[key] !== 'string' || !(values as readonly string[]).includes(body[key])) throw new Error(`Invalid contract ${key}`)
    data[key] = body[key]
  }
  if ('currentValue' in body || 'currentContractValue' in body) throw new Error('Current contract value is calculated, not editable')
  return data
}
