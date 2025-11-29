import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        shareToken: token,
        isActive: true
      },
      include: {
        company: {
          select: {
            name: true,
            logo: true,
            email: true,
            phone: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            fileName: true,
            url: true,
            createdAt: true
          }
        }
      }
    })

    if (!bidRequest) {
      return NextResponse.json({ error: 'Bid request not found or expired' }, { status: 404 })
    }

    // Track the view
    await prisma.bidView.create({
      data: {
        bidRequestId: bidRequest.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Calculate days remaining if deadline exists
    let daysRemaining = null
    if (bidRequest.deadline) {
      const now = new Date()
      const deadline = new Date(bidRequest.deadline)
      const diffTime = deadline.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      bidRequest: {
        id: bidRequest.id,
        title: bidRequest.title,
        description: bidRequest.description,
        location: bidRequest.location,
        timeline: bidRequest.timeline,
        requirements: bidRequest.requirements,
        deadline: bidRequest.deadline,
        budget: bidRequest.budget,
        daysRemaining,
        company: bidRequest.company,
        documents: bidRequest.documents
      }
    })
  } catch (error) {
    console.error('Error fetching public bid request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid request' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        shareToken: token,
        isActive: true
      }
    })

    if (!bidRequest) {
      return NextResponse.json({ error: 'Bid request not found or expired' }, { status: 404 })
    }

    // Check if deadline has passed
    if (bidRequest.deadline && new Date() > bidRequest.deadline) {
      return NextResponse.json({ error: 'Bid deadline has passed' }, { status: 400 })
    }

    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      licenseNumber,
      insuranceInfo,
      subtotal,
      tax,
      discount,
      totalAmount,
      notes,
      timeline,
      warranty,
      paymentTerms,
      lineItems,
      hasUploadedFile,
      fileName,
      fileUrl
    } = body

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json({ 
        error: 'Company name, contact name, and email are required' 
      }, { status: 400 })
    }

    // Create bid with line items if provided
    const bid = await prisma.bid.create({
      data: {
        bidRequestId: bidRequest.id,
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone?.trim(),
        licenseNumber: licenseNumber?.trim(),
        insuranceInfo: insuranceInfo?.trim(),
        subtotal: subtotal ? parseFloat(subtotal) : null,
        tax: tax ? parseFloat(tax) : null,
        discount: discount ? parseFloat(discount) : null,
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        notes: notes?.trim(),
        timeline: timeline?.trim(),
        warranty: warranty?.trim(),
        paymentTerms: paymentTerms?.trim(),
        lineItems: lineItems ? JSON.stringify(lineItems) : null,
        hasUploadedFile: hasUploadedFile || false,
        fileName: fileName?.trim(),
        fileUrl: fileUrl?.trim(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        items: lineItems && Array.isArray(lineItems) ? {
          create: lineItems.map((item: any, index: number) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            order: index
          }))
        } : undefined
      },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      bidId: bid.id,
      message: 'Bid submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting bid:', error)
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    )
  }
}