import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create walkaround session
    const walkaround = await prisma.walkaround.create({
      data: {
        projectId,
        userId: user.id,
        startTime: body.startTime,
        status: 'IN_PROGRESS',
        metadata: body.metadata || {}
      }
    });

    return NextResponse.json({ 
      id: walkaround.id,
      projectId: walkaround.projectId,
      status: walkaround.status 
    });
  } catch (error) {
    console.error('Failed to create walkaround session:', error);
    return NextResponse.json(
      { error: 'Failed to create walkaround session' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Get all walkarounds for this project
    const walkarounds = await prisma.walkaround.findMany({
      where: {
        projectId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        photos: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(walkarounds);
  } catch (error) {
    console.error('Failed to get walkarounds:', error);
    return NextResponse.json(
      { error: 'Failed to get walkarounds' },
      { status: 500 }
    );
  }
}