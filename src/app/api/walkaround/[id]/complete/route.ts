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

    const { id: walkaroundId } = await params;
    const body = await request.json();
    
    // Verify walkaround exists and belongs to user
    const walkaround = await prisma.walkaround.findFirst({
      where: { 
        id: walkaroundId,
        userId: user.id
      },
      include: {
        photos: true,
        project: true
      }
    });

    if (!walkaround) {
      return NextResponse.json({ error: 'Walkaround not found' }, { status: 404 });
    }

    // Update walkaround as processing
    await prisma.walkaround.update({
      where: { id: walkaroundId },
      data: { 
        endTime: body.endTime || new Date(),
        status: 'PROCESSING'
      }
    });

    // TODO: Here you would trigger AI processing
    // 1. Transcribe audio using Whisper API
    // 2. Generate summary using OpenAI/Claude
    // 3. Create PDF report
    // For now, we'll just mark it as completed

    // Simulate processing completion
    const updatedWalkaround = await prisma.walkaround.update({
      where: { id: walkaroundId },
      data: { 
        status: 'COMPLETED',
        summary: `Walkaround completed with ${walkaround.photos.length} photos. Audio duration: ${body.duration || 'N/A'} seconds.`,
        // transcript and reportUrl would be set after AI processing
      },
      include: {
        photos: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'WALKAROUND_COMPLETED',
        description: `Walkaround completed by ${user.firstName} ${user.lastName}`,
        cardId: walkaround.projectId,
        userId: user.id
      }
    });

    return NextResponse.json({ 
      success: true,
      walkaround: updatedWalkaround
    });
  } catch (error) {
    console.error('Failed to complete walkaround:', error);
    return NextResponse.json(
      { error: 'Failed to complete walkaround' },
      { status: 500 }
    );
  }
}