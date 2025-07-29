import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db: any = null;

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS week_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        week_key TEXT NOT NULL,
        daily_tasks TEXT DEFAULT '{}',
        weekly_goals TEXT DEFAULT '[]',
        habit_completions TEXT DEFAULT '{}',
        week_locked BOOLEAN DEFAULT false,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, week_key)
      );
    `);
  }
  return db;
}

export async function query(text: string, params?: any[]) {
  const database = await getDb();
  try {
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      const rows = await database.all(text, params);
      return { rows };
    } else {
      const result = await database.run(text, params);
      return { rows: [{ id: result.lastID }] };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function createUser(email: string, passwordHash: string, name: string) {
  const database = await getDb();
  const result = await database.run(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [email, passwordHash, name]
  );
  return { id: result.lastID, email, name };
}

export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT id, email, password_hash, name FROM users WHERE email = ?',
    [email]
  );
  return result.rows[0];
}

export async function getUserHabits(userId: number) {
  const result = await query(
    'SELECT id, name FROM habits WHERE user_id = ? AND is_active = true ORDER BY created_at',
    [userId]
  );
  return result.rows;
}

export async function createHabit(userId: number, name: string) {
  const sanitizedName = name.trim().substring(0, 100);
  const database = await getDb();
  
  console.log('Creating habit:', { userId, name: sanitizedName }); // Debug log
  
  const result = await database.run(
    'INSERT INTO habits (user_id, name) VALUES (?, ?)',
    [userId, sanitizedName]
  );
  
  console.log('Habit created with ID:', result.lastID); // Debug log
  
  return { id: result.lastID, name: sanitizedName };
}

export async function deleteHabit(userId: number, habitId: number) {
  await query(
    'UPDATE habits SET is_active = false WHERE id = ? AND user_id = ?',
    [habitId, userId]
  );
}

export async function getWeekData(userId: number, weekKey: string) {
  const result = await query(
    'SELECT daily_tasks, weekly_goals, habit_completions, week_locked FROM week_data WHERE user_id = ? AND week_key = ?',
    [userId, weekKey]
  );
  
  if (result.rows[0]) {
    return {
      daily_tasks: JSON.parse(result.rows[0].daily_tasks || '{}'),
      weekly_goals: JSON.parse(result.rows[0].weekly_goals || '[]'),
      habit_completions: JSON.parse(result.rows[0].habit_completions || '{}'),
      week_locked: result.rows[0].week_locked
    };
  }
  return result.rows[0];
}

export async function saveWeekData(
  userId: number, 
  weekKey: string, 
  dailyTasks: any, 
  weeklyGoals: any, 
  habitCompletions: any, 
  weekLocked: boolean
) {
  const database = await getDb();
  await database.run(
    `INSERT OR REPLACE INTO week_data (user_id, week_key, daily_tasks, weekly_goals, habit_completions, week_locked, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, weekKey, JSON.stringify(dailyTasks), JSON.stringify(weeklyGoals), JSON.stringify(habitCompletions), weekLocked ? 1 : 0]
  );
  return {};
}

export async function getAllWeeksData(userId: number) {
  const result = await query(
    'SELECT week_key, daily_tasks, weekly_goals, habit_completions, week_locked FROM week_data WHERE user_id = ? ORDER BY week_key',
    [userId]
  );
  
  return result.rows.map(row => ({
    ...row,
    daily_tasks: JSON.parse(row.daily_tasks || '{}'),
    weekly_goals: JSON.parse(row.weekly_goals || '[]'),
    habit_completions: JSON.parse(row.habit_completions || '{}')
  }));
}
