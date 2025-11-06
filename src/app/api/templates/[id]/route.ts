import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.JWT_SECRET || 'secret') as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const resolvedParams = await params
    const template = await prisma.projectTemplate.findFirst({
      where: {
        id: resolvedParams.id,
        companyId: user.companyId
      }
    })
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    await prisma.projectTemplate.update({
      where: { id: resolvedParams.id },
      data: { isActive: false }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}