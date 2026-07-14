import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

interface ParsedRow {
  code: string
  name: string
  description?: string
  csiDivision?: string
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function extractRow(record: Record<string, unknown>): ParsedRow | null {
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    normalized[normalizeHeader(key)] = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  }

  const code = normalized['code']
  const name = normalized['name']
  const description = normalized['description']
  const csiDivision = normalized['csidivision'] || normalized['division']

  if (!code || !name) {
    return null
  }

  return {
    code,
    name,
    description: description || undefined,
    csiDivision: csiDivision || undefined
  }
}

function parseCSV(content: string): { rows: ParsedRow[]; warnings: string[] } {
  const warnings: string[] = []
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true
  })

  const rows: ParsedRow[] = []
  result.data.forEach((record, index) => {
    const row = extractRow(record)
    if (!row) {
      warnings.push(`Row ${index + 2}: missing required "code" or "name" column, skipped`)
      return
    }
    rows.push(row)
  })

  return { rows, warnings }
}

async function parseExcel(buffer: ArrayBuffer): Promise<{ rows: ParsedRow[]; warnings: string[] }> {
  const warnings: string[] = []
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return { rows: [], warnings: ['Workbook has no sheets'] }
  }

  const headerRow = worksheet.getRow(1)
  const columnHeaders: Record<number, string> = {}
  headerRow.eachCell((cell, colNumber) => {
    columnHeaders[colNumber] = normalizeHeader(String(cell.value ?? ''))
  })

  const rows: ParsedRow[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const record: Record<string, unknown> = {}
    row.eachCell((cell, colNumber) => {
      const header = columnHeaders[colNumber]
      if (header) {
        record[header] = cell.value
      }
    })

    if (Object.keys(record).length === 0) return

    const parsedRow = extractRow(record)
    if (!parsedRow) {
      warnings.push(`Row ${rowNumber}: missing required "code" or "name" column, skipped`)
      return
    }
    rows.push(parsedRow)
  })

  return { rows, warnings }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can import cost codes' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    let rows: ParsedRow[] = []
    let warnings: string[] = []

    if (fileName.endsWith('.csv')) {
      const content = await file.text()
      const parsed = parseCSV(content)
      rows = parsed.rows
      warnings = parsed.warnings
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      const parsed = await parseExcel(buffer)
      rows = parsed.rows
      warnings = parsed.warnings
    } else {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .csv or .xlsx file.' },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid cost code rows found in file', warnings },
        { status: 400 }
      )
    }

    // De-duplicate by code within the file itself, keeping the last occurrence
    const byCode = new Map<string, ParsedRow>()
    for (const row of rows) {
      if (byCode.has(row.code)) {
        warnings.push(`Duplicate code "${row.code}" in file, using last occurrence`)
      }
      byCode.set(row.code, row)
    }

    const existingCodes = await prisma.costCode.findMany({
      where: { companyId: user.companyId },
      select: { code: true, sortOrder: true }
    })
    const existingCodeSet = new Set(existingCodes.map(c => c.code))
    let nextSortOrder = existingCodes.length > 0
      ? Math.max(...existingCodes.map(c => c.sortOrder)) + 1
      : 0

    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const row of byCode.values()) {
      try {
        if (existingCodeSet.has(row.code)) {
          await prisma.costCode.update({
            where: {
              companyId_code: {
                companyId: user.companyId,
                code: row.code
              }
            },
            data: {
              name: row.name,
              description: row.description || null,
              csiDivision: row.csiDivision || null
            }
          })
          updatedCount++
        } else {
          await prisma.costCode.create({
            data: {
              code: row.code,
              name: row.name,
              description: row.description || null,
              csiDivision: row.csiDivision || null,
              sortOrder: nextSortOrder++,
              companyId: user.companyId
            }
          })
          createdCount++
        }
      } catch (rowError) {
        console.error(`Error importing cost code "${row.code}":`, rowError)
        warnings.push(`Row with code "${row.code}" could not be imported`)
        skippedCount++
      }
    }

    return NextResponse.json({
      createdCount,
      updatedCount,
      skippedCount,
      warnings
    })

  } catch (error) {
    console.error('Error importing cost codes:', error)
    return NextResponse.json(
      { error: 'Failed to import cost codes' },
      { status: 500 }
    )
  }
}
