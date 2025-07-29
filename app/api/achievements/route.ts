import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return empty achievements - you can implement database storage later
    return NextResponse.json({ achievements: [] });

  } catch (error) {
    console.error('Get achievements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
