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

// Helper function to handle column fallback queries
async function queryWithColumnFallback(
  primaryQuery: string,
  fallbackQuery: string,
  primaryParams: any[],
  fallbackParams: any[],
  columnName: string,
  fallbackTransform?: (rows: any[]) => any[]
) {
  try {
    const result = await query(primaryQuery, primaryParams);
    return result.rows;
  } catch (error: any) {
    if (error.message && error.message.includes(columnName)) {
      console.log(`${columnName} column not found, using fallback query`);
      const result = await query(fallbackQuery, fallbackParams);
      return fallbackTransform ? fallbackTransform(result.rows) : result.rows;
    }
    throw error;
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
  return queryWithColumnFallback(
    'SELECT id, name, target FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at',
    'SELECT id, name FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at',
    [userId],
    [userId],
    'target',
    (rows) => rows.map(row => ({ ...row, target: 7 }))
  );
}

export async function createHabit(userId: number, name: string, target: number = 7) {
  const sanitizedName = name.trim().substring(0, 100);
  const sanitizedTarget = Math.max(1, Math.min(7, target)); // Ensure target is between 1-7
  
  const rows = await queryWithColumnFallback(
    'INSERT INTO habits (user_id, name, target) VALUES ($1, $2, $3) RETURNING id, name, target',
    'INSERT INTO habits (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [userId, sanitizedName, sanitizedTarget],
    [userId, sanitizedName],
    'target',
    (rows) => rows.map(row => ({ ...row, target: 7 }))
  );
  return rows[0];
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
  
  // Try with future_tasks column first, fallback if it doesn't exist
  try {
    const result = await query(
      'SELECT daily_tasks, weekly_goals, habit_completions, future_tasks, week_locked FROM week_data WHERE user_id = $1 AND week_key = $2',
      [userId, weekKey]
    );
    return result.rows[0];
  } catch (error: any) {
    // If future_tasks column doesn't exist, try without it
    if (error.message && error.message.includes('future_tasks')) {
      console.log('future_tasks column not found, using fallback query');
      const result = await query(
        'SELECT daily_tasks, weekly_goals, habit_completions, week_locked FROM week_data WHERE user_id = $1 AND week_key = $2',
        [userId, weekKey]
      );
      const data = result.rows[0];
      if (data) {
        data.future_tasks = []; // Add empty future_tasks for compatibility
      }
      return data;
    }
    throw error;
  }
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
  // Try with future_tasks column first, fallback if it doesn't exist
  try {
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
  } catch (error: any) {
    // If future_tasks column doesn't exist, save without it
    if (error.message && error.message.includes('future_tasks')) {
      console.log('future_tasks column not found, saving without it');
      const result = await query(
        `INSERT INTO week_data (user_id, week_key, daily_tasks, weekly_goals, habit_completions, week_locked, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, week_key) 
         DO UPDATE SET 
           daily_tasks = EXCLUDED.daily_tasks,
           weekly_goals = EXCLUDED.weekly_goals,
           habit_completions = EXCLUDED.habit_completions,
           week_locked = EXCLUDED.week_locked,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, weekKey, JSON.stringify(dailyTasks), JSON.stringify(weeklyGoals), JSON.stringify(habitCompletions), weekLocked]
      );
      return result.rows[0];
    }
    throw error;
  }
}

// Try to add future_tasks column if it doesn't exist (safe migration)
export async function ensureFutureTasksColumn() {
  try {
    await query('ALTER TABLE week_data ADD COLUMN IF NOT EXISTS future_tasks JSONB DEFAULT \'[]\'');
    console.log('future_tasks column ensured');
  } catch (error: any) {
    // Ignore errors if column already exists or other permission issues
    console.log('Could not add future_tasks column (this is OK):', error.message);
  }
}

// Try to add target column to habits if it doesn't exist (safe migration)
export async function ensureHabitTargetColumn() {
  try {
    await query('ALTER TABLE habits ADD COLUMN IF NOT EXISTS target INTEGER DEFAULT 7');
    console.log('habits target column ensured');
  } catch (error: any) {
    // Ignore errors if column already exists or other permission issues
    console.log('Could not add habits target column (this is OK):', error.message);
  }
}

export async function getAllWeeksData(userId: number) {
  // Try with future_tasks column first, fallback if it doesn't exist
  try {
    const result = await query(
      'SELECT week_key, daily_tasks, weekly_goals, habit_completions, future_tasks, week_locked FROM week_data WHERE user_id = $1 ORDER BY week_key',
      [userId]
    );
    return result.rows;
  } catch (error: any) {
    // If future_tasks column doesn't exist, try without it
    if (error.message && error.message.includes('future_tasks')) {
      console.log('future_tasks column not found in getAllWeeksData, using fallback');
      const result = await query(
        'SELECT week_key, daily_tasks, weekly_goals, habit_completions, week_locked FROM week_data WHERE user_id = $1 ORDER BY week_key',
        [userId]
      );
      // Add empty future_tasks for compatibility
      return result.rows.map(row => ({
        ...row,
        future_tasks: []
      }));
    }
    throw error;
  }
}
