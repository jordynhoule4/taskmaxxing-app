import { NextRequest, NextResponse } from 'next/server';
import { getUserHabits, createHabit, deleteHabit } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const habits = await getUserHabits(user.userId as number);
    return NextResponse.json({ habits });

  } catch (error) {
    console.error('Get habits error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400 });
    }

    const habit = await createHabit(user.userId as number, name.trim());
    return NextResponse.json({ habit }, { status: 201 });

  } catch (error) {
    console.error('Create habit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('id');
    
    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400 });
    }

    await deleteHabit(user.userId as number, parseInt(habitId));
    return NextResponse.json({ message: 'Habit deleted successfully' });

  } catch (error) {
    console.error('Delete habit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
