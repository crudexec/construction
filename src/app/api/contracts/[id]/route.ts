import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { parseContractDetails } from '@/lib/contracts/details'

export async function GET(
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

    const { id } = await params

    const contract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            status: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                budget: true,
                projectNumber: true
              }
            }
          }
        },
        contractSuppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
                linkedVendorId: true,
                notes: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            attachments: {
              orderBy: { createdAt: 'desc' }
            },
            costAllocations: {
              include: {
                costCode: {
                  select: {
                    id: true,
                    code: true,
                    name: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            lienReleaseLinks: {
              include: {
                lienRelease: {
                  include: {
                    supplier: {
                      select: {
                        id: true,
                        name: true
                      }
                    },
                    documents: {
                      orderBy: { createdAt: 'desc' }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        changeOrders: {
          select: {
            id: true,
            totalAmount: true,
            status: true
          }
        },
        lienReleases: {
          orderBy: { updatedAt: 'desc' },
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            },
            supplier: {
              select: {
                id: true,
                name: true
              }
            },
            requestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            reviewedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            documents: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)

  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const { id } = await params

    // Verify contract exists and belongs to user's company
    const existingContract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const body = await request.json()

    let changes
    try {
      changes = parseContractDetails(body, existingContract)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid contract details' }, { status: 400 })
    }
    if (body.updatedAt !== undefined && body.updatedAt !== existingContract.updatedAt.toISOString()) {
      return NextResponse.json({ error: 'Contract changed. Reload before saving.' }, { status: 409 })
    }
    if (typeof changes.contractNumber === 'string' && changes.contractNumber !== existingContract.contractNumber) {
      const duplicate = await prisma.vendorContract.findFirst({
        where: { companyId: user.companyId, contractNumber: changes.contractNumber, id: { not: id } }
      })
      if (duplicate) return NextResponse.json({ error: 'Contract number already exists' }, { status: 409 })
    }
    // Optimistic check is part of the write, not only a preflight read.
    const updated = await prisma.vendorContract.updateMany({
      where: { id, updatedAt: existingContract.updatedAt },
      data: changes as Prisma.VendorContractUpdateManyMutationInput
    })
    if (!updated.count) return NextResponse.json({ error: 'Contract changed. Reload before saving.' }, { status: 409 })
    const contract = await prisma.vendorContract.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(contract)

  } catch (error) {
    console.error('Error updating contract:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Contract number already exists' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only admins can delete contracts
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete contracts' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify contract exists and belongs to user's company
    const existingContract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.vendorContract.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Contract deleted successfully' })

  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
