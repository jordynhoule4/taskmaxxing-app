import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function getDatabase() {
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}

async function getUserFromToken(request: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.userId;
  } catch (error) {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.id);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const { title, content } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Check if note exists and belongs to user
    const existingNote = await db.get(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    if (!existingNote) {
      await db.close();
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await db.run(
      'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [title.trim(), content || '', noteId, userId]
    );

    const updatedNote = await db.get(
      'SELECT * FROM notes WHERE id = ?',
      [noteId]
    );

    await db.close();

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const noteId = parseInt(params.id);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Check if note exists and belongs to user
    const existingNote = await db.get(
      'SELECT id FROM notes WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    if (!existingNote) {
      await db.close();
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await db.run(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    await db.close();

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}