import { NextRequest, NextResponse } from 'next/server'
import { validateUser } from '@/lib/auth'
import { createDocumentGenerator } from '@/lib/documents'

// POST - Generate a document from a template
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

    const body = await request.json()
    const { templateId, recordType, recordId, options } = body

    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    if (!recordType) {
      return NextResponse.json(
        { error: 'Record type is required' },
        { status: 400 }
      )
    }

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      )
    }

    // Validate record type
    const validRecordTypes = ['change-order', 'purchase-order', 'vendor-contract', 'estimate', 'bid']
    if (!validRecordTypes.includes(recordType)) {
      return NextResponse.json(
        { error: `Invalid record type. Must be one of: ${validRecordTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create document generator
    const generator = await createDocumentGenerator(user.companyId)

    // Generate the document
    const document = await generator.generate({
      templateId,
      recordType,
      recordId,
      options,
    })

    // Return the generated HTML, filename, and vendorId for auto-saving
    // Client will handle PDF conversion using html2pdf.js
    return NextResponse.json({
      html: document.html,
      filename: document.filename,
      vendorId: document.vendorId,
    })
  } catch (error) {
    console.error('Error generating document:', error)

    if (error instanceof Error) {
      // Return specific error messages for known errors
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('not yet supported')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    )
  }
}
