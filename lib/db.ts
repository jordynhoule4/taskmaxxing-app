import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createUser(email: string, passwordHash: string, name: string) {
  const result = await query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, passwordHash, name]
  );
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT id, email, password_hash, name FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

export async function getUserHabits(userId: number) {
  const result = await query(
    'SELECT id, name FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at',
    [userId]
  );
  return result.rows;
}

export async function createHabit(userId: number, name: string) {
  const sanitizedName = name.trim().substring(0, 100);
  const result = await query(
    'INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, sanitizedName]
  );
  return result.rows[0];
}

export async function deleteHabit(userId: number, habitId: number) {
  await query(
    'UPDATE habits SET is_active = false WHERE id = $1 AND user_id = $2',
    [habitId, userId]
  );
}

export async function getWeekData(userId: number, weekKey: string) {
  const weekKeyPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (!weekKeyPattern.test(weekKey)) {
    throw new Error('Invalid week key format');
  }
  
  const result = await query(
    'SELECT daily_tasks, weekly_goals, habit_completions, future_tasks, week_locked FROM week_data WHERE user_id = $1 AND week_key = $2',
    [userId, weekKey]
  );
  return result.rows[0];
}

export async function saveWeekData(
  userId: number, 
  weekKey: string, 
  dailyTasks: any, 
  weeklyGoals: any, 
  habitCompletions: any, 
  futureTasks: any,
  weekLocked: boolean
) {
  const result = await query(
    `INSERT INTO week_data (user_id, week_key, daily_tasks, weekly_goals, habit_completions, future_tasks, week_locked, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, week_key) 
     DO UPDATE SET 
       daily_tasks = EXCLUDED.daily_tasks,
       weekly_goals = EXCLUDED.weekly_goals,
       habit_completions = EXCLUDED.habit_completions,
       future_tasks = EXCLUDED.future_tasks,
       week_locked = EXCLUDED.week_locked,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, weekKey, JSON.stringify(dailyTasks), JSON.stringify(weeklyGoals), JSON.stringify(habitCompletions), JSON.stringify(futureTasks), weekLocked]
  );
  return result.rows[0];
}

export async function getAllWeeksData(userId: number) {
  const result = await query(
    'SELECT week_key, daily_tasks, weekly_goals, habit_completions, future_tasks, week_locked FROM week_data WHERE user_id = $1 ORDER BY week_key',
    [userId]
  );
  return result.rows;
}
