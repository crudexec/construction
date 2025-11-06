import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, companyName } = body

    if (!email || !password || !firstName || !lastName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const company = await prisma.company.create({
      data: {
        name: companyName,
        email,
      }
    })

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.ADMIN,
        companyId: company.id
      },
      include: {
        company: true
      }
    })

    await prisma.stage.createMany({
      data: [
        { name: 'New Lead', color: '#3b82f6', order: 0, companyId: company.id },
        { name: 'Contacted', color: '#8b5cf6', order: 1, companyId: company.id },
        { name: 'Qualified', color: '#ec4899', order: 2, companyId: company.id },
        { name: 'Proposal', color: '#f59e0b', order: 3, companyId: company.id },
        { name: 'Negotiation', color: '#84cc16', order: 4, companyId: company.id },
        { name: 'Won', color: '#10b981', order: 5, companyId: company.id },
      ]
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}