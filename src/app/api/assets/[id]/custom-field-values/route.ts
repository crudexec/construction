import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// PUT - Upsert all custom field values for an asset in one request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: assetId } = await params

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const values = body.values

    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return NextResponse.json({ error: 'values must be an object of { fieldDefinitionId: value }' }, { status: 400 })
    }

    const fieldDefinitionIds = Object.keys(values)
    if (fieldDefinitionIds.length === 0) {
      return NextResponse.json([])
    }

    const validDefinitions = await prisma.assetCustomFieldDefinition.findMany({
      where: { id: { in: fieldDefinitionIds }, companyId: user.companyId }
    })

    if (validDefinitions.length !== fieldDefinitionIds.length) {
      return NextResponse.json({ error: 'One or more custom fields not found' }, { status: 404 })
    }

    const results = await Promise.all(
      fieldDefinitionIds.map((fieldDefinitionId) => {
        const rawValue = values[fieldDefinitionId]
        const value = rawValue === null || rawValue === undefined ? null : String(rawValue)

        return prisma.assetCustomFieldValue.upsert({
          where: {
            assetId_fieldDefinitionId: {
              assetId,
              fieldDefinitionId
            }
          },
          create: {
            assetId,
            fieldDefinitionId,
            value
          },
          update: {
            value
          },
          include: {
            definition: true
          }
        })
      })
    )

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error updating asset custom field values:', error)
    return NextResponse.json(
      { error: 'Failed to update custom field values' },
      { status: 500 }
    )
  }
}
