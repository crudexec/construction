import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      companyId: user.companyId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          leases: {
            where: { status: 'ACTIVE' },
            include: {
              property: {
                select: {
                  id: true,
                  name: true
                }
              },
              unit: {
                select: {
                  id: true,
                  unitNumber: true
                }
              }
            },
            take: 1,
            orderBy: { startDate: 'desc' }
          },
          _count: {
            select: {
              leases: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.tenant.count({ where })
    ])

    return NextResponse.json({
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
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

    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      alternatePhone,
      dateOfBirth,
      idType,
      idNumber,
      employer,
      jobTitle,
      monthlyIncome,
      employerPhone,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      notes,
      status = 'ACTIVE'
    } = body

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Check for duplicate email within company
    const existing = await prisma.tenant.findFirst({
      where: {
        companyId: user.companyId,
        email: email.toLowerCase()
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A tenant with this email already exists' },
        { status: 400 }
      )
    }

    const tenant = await prisma.tenant.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        alternatePhone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        idType,
        idNumber,
        employer,
        jobTitle,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        employerPhone,
        emergencyName,
        emergencyPhone,
        emergencyRelation,
        notes,
        status,
        companyId: user.companyId
      },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            property: {
              select: { id: true, name: true }
            },
            unit: {
              select: { id: true, unitNumber: true }
            }
          }
        }
      }
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
