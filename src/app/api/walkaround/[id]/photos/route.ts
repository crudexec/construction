import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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
    
    // Verify walkaround exists and belongs to user
    const walkaround = await prisma.walkaround.findFirst({
      where: { 
        id: walkaroundId,
        userId: user.id
      }
    });

    if (!walkaround) {
      return NextResponse.json({ error: 'Walkaround not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const photoFile = formData.get('photo') as File;
    const timestamp = formData.get('timestamp') as string;
    const location = formData.get('location') as string;
    const caption = formData.get('caption') as string;
    
    if (!photoFile) {
      return NextResponse.json({ error: 'No photo file provided' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'walkarounds', walkaroundId, 'photos');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save photo file
    const fileName = `photo_${Date.now()}.jpg`;
    const filePath = join(uploadDir, fileName);
    const bytes = await photoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get current photo count for ordering
    const photoCount = await prisma.walkaroundPhoto.count({
      where: { walkaroundId }
    });

    // Create photo record
    const photoUrl = `/uploads/walkarounds/${walkaroundId}/photos/${fileName}`;
    const photo = await prisma.walkaroundPhoto.create({
      data: {
        walkaroundId,
        url: photoUrl,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        location: location || null,
        caption: caption || null,
        order: photoCount
      }
    });

    return NextResponse.json({ 
      success: true,
      photo 
    });
  } catch (error) {
    console.error('Failed to upload photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
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

    const { id: walkaroundId } = await params;

    // Get photos for this walkaround
    const photos = await prisma.walkaroundPhoto.findMany({
      where: {
        walkaroundId,
        walkaround: {
          project: {
            companyId: user.companyId
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Failed to get photos:', error);
    return NextResponse.json(
      { error: 'Failed to get photos' },
      { status: 500 }
    );
  }
}