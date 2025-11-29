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
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'walkarounds', walkaroundId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save audio file
    const fileName = `audio_${Date.now()}.m4a`;
    const filePath = join(uploadDir, fileName);
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update walkaround with audio URL
    const audioUrl = `/uploads/walkarounds/${walkaroundId}/${fileName}`;
    await prisma.walkaround.update({
      where: { id: walkaroundId },
      data: { 
        audioUrl,
        status: 'UPLOADING'
      }
    });

    return NextResponse.json({ 
      success: true,
      audioUrl 
    });
  } catch (error) {
    console.error('Failed to upload audio:', error);
    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    );
  }
}