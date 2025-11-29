import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET: Get client portal settings for a project
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

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get or create portal settings
    let portalSettings = await prisma.clientPortalSettings.findUnique({
      where: { projectId: id }
    })

    if (!portalSettings) {
      // Create default settings if they don't exist
      portalSettings = await prisma.clientPortalSettings.create({
        data: {
          projectId: id
        }
      })
    }

    return NextResponse.json({ settings: portalSettings })
  } catch (error) {
    console.error('Error fetching portal settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portal settings' },
      { status: 500 }
    )
  }
}

// PUT: Update client portal settings
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
    }

    const { id } = await params
    const settings = await request.json()

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update or create portal settings
    const portalSettings = await prisma.clientPortalSettings.upsert({
      where: { projectId: id },
      update: {
        // Project Overview Settings
        showProgress: settings.showProgress,
        showTimeline: settings.showTimeline,
        showBudgetSummary: settings.showBudgetSummary,
        showProjectDescription: settings.showProjectDescription,
        showTeamMembers: settings.showTeamMembers,
        
        // Tasks Settings
        showTasks: settings.showTasks,
        showTaskAssignees: settings.showTaskAssignees,
        showTaskDueDates: settings.showTaskDueDates,
        showCompletedTasks: settings.showCompletedTasks,
        hideInternalTasks: settings.hideInternalTasks,
        
        // Documents & Files Settings
        showDocuments: settings.showDocuments,
        allowedFileTypes: settings.allowedFileTypes ? JSON.stringify(settings.allowedFileTypes) : null,
        hideInternalDocuments: settings.hideInternalDocuments,
        
        // Estimates & Financial Settings
        showEstimates: settings.showEstimates,
        showEstimateDetails: settings.showEstimateDetails,
        showInvoices: settings.showInvoices,
        showPayments: settings.showPayments,
        
        // Communication Settings
        showMessages: settings.showMessages,
        showActivityFeed: settings.showActivityFeed,
        hideInternalMessages: settings.hideInternalMessages,
        
        // Additional Settings
        showPhotos: settings.showPhotos,
        showWalkarounds: settings.showWalkarounds,
        customWelcomeMessage: settings.customWelcomeMessage,
      },
      create: {
        projectId: id,
        // Project Overview Settings
        showProgress: settings.showProgress ?? true,
        showTimeline: settings.showTimeline ?? true,
        showBudgetSummary: settings.showBudgetSummary ?? false,
        showProjectDescription: settings.showProjectDescription ?? true,
        showTeamMembers: settings.showTeamMembers ?? true,
        
        // Tasks Settings
        showTasks: settings.showTasks ?? true,
        showTaskAssignees: settings.showTaskAssignees ?? false,
        showTaskDueDates: settings.showTaskDueDates ?? true,
        showCompletedTasks: settings.showCompletedTasks ?? true,
        hideInternalTasks: settings.hideInternalTasks ?? true,
        
        // Documents & Files Settings
        showDocuments: settings.showDocuments ?? true,
        allowedFileTypes: settings.allowedFileTypes ? JSON.stringify(settings.allowedFileTypes) : null,
        hideInternalDocuments: settings.hideInternalDocuments ?? true,
        
        // Estimates & Financial Settings
        showEstimates: settings.showEstimates ?? true,
        showEstimateDetails: settings.showEstimateDetails ?? false,
        showInvoices: settings.showInvoices ?? false,
        showPayments: settings.showPayments ?? false,
        
        // Communication Settings
        showMessages: settings.showMessages ?? true,
        showActivityFeed: settings.showActivityFeed ?? true,
        hideInternalMessages: settings.hideInternalMessages ?? true,
        
        // Additional Settings
        showPhotos: settings.showPhotos ?? true,
        showWalkarounds: settings.showWalkarounds ?? false,
        customWelcomeMessage: settings.customWelcomeMessage,
      }
    })

    return NextResponse.json({ 
      message: 'Portal settings updated successfully',
      settings: portalSettings 
    })
  } catch (error) {
    console.error('Error updating portal settings:', error)
    return NextResponse.json(
      { error: 'Failed to update portal settings' },
      { status: 500 }
    )
  }
}