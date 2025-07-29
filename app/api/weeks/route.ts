import { NextRequest, NextResponse } from 'next/server';
import { getWeekData, saveWeekData, getAllWeeksData, ensureFutureTasksColumn } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Try to ensure the future_tasks column exists
    await ensureFutureTasksColumn();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week');
    const getAll = searchParams.get('all');

    if (getAll === 'true') {
      const allWeeks = await getAllWeeksData(user.userId as number);
      const weeksData: any = {};
      
      allWeeks.forEach(week => {
        weeksData[week.week_key] = {
          dailyTasks: week.daily_tasks,
          weeklyGoals: week.weekly_goals,
          habitCompletions: week.habit_completions,
          weekLocked: week.week_locked,
          futureTasks: week.future_tasks
        };
      });

      return NextResponse.json({ allWeeksData: weeksData });
    }

    if (!weekKey) {
      return NextResponse.json({ error: 'Week key is required' }, { status: 400 });
    }

    const weekData = await getWeekData(user.userId as number, weekKey);
    
    if (!weekData) {
      return NextResponse.json({
        weekData: {
          dailyTasks: {},
          weeklyGoals: [],
          habitCompletions: {},
          weekLocked: false,
          futureTasks: []
        }
      });
    }

    return NextResponse.json({
      weekData: {
        dailyTasks: weekData.daily_tasks,
        weeklyGoals: weekData.weekly_goals,
        habitCompletions: weekData.habit_completions,
        weekLocked: weekData.week_locked,
        futureTasks: weekData.future_tasks
      }
    });

  } catch (error) {
    console.error('Get week data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to ensure the future_tasks column exists
    await ensureFutureTasksColumn();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekKey, dailyTasks, weeklyGoals, habitCompletions, weekLocked, futureTasks } = await request.json();

    if (!weekKey) {
      return NextResponse.json({ error: 'Week key is required' }, { status: 400 });
    }

    const savedData = await saveWeekData(
      user.userId as number,
      weekKey,
      dailyTasks || {},
      weeklyGoals || [],
      habitCompletions || {},
      futureTasks || [],
      weekLocked || false
    );

    return NextResponse.json({ 
      message: 'Week data saved successfully',
      weekData: savedData 
    });

  } catch (error) {
    console.error('Save week data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
