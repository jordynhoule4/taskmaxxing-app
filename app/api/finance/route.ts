import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    const payload = await verifyToken(token);
    return payload?.userId;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    
    // Create financial_data table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS financial_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        credit_card_bill REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, month)
      )
    `);

    // Create financial_settings table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS financial_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        monthly_income REAL NOT NULL DEFAULT 0,
        rent REAL NOT NULL DEFAULT 0,
        savings_goal REAL NOT NULL DEFAULT 0,
        spending_limit REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id)
      )
    `);

    const finances = await db.all(
      'SELECT id, month, credit_card_bill as creditCardBill, notes FROM financial_data WHERE user_id = ? ORDER BY month DESC',
      [userId]
    );

    // Get user's financial settings
    const settings = await db.get(
      'SELECT monthly_income as monthlyIncome, rent, savings_goal as savingsGoal, spending_limit as spendingLimit FROM financial_settings WHERE user_id = ?',
      [userId]
    );

    await db.close();

    return NextResponse.json({ finances, settings });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, creditCardBill, notes, settings } = await request.json();

    if (!month || creditCardBill === undefined) {
      return NextResponse.json({ error: 'Month and credit card bill are required' }, { status: 400 });
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS financial_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        credit_card_bill REAL NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, month)
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS financial_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        monthly_income REAL NOT NULL DEFAULT 0,
        rent REAL NOT NULL DEFAULT 0,
        savings_goal REAL NOT NULL DEFAULT 0,
        spending_limit REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id)
      )
    `);

    // Update financial settings if provided
    if (settings) {
      await db.run(
        `INSERT INTO financial_settings (user_id, monthly_income, rent, savings_goal, spending_limit, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) 
         DO UPDATE SET 
           monthly_income = excluded.monthly_income,
           rent = excluded.rent,
           savings_goal = excluded.savings_goal,
           spending_limit = excluded.spending_limit,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, settings.monthlyIncome || 0, settings.rent || 0, settings.savingsGoal || 0, settings.spendingLimit || 0]
      );
    }

    // Insert or update financial data
    await db.run(
      `INSERT INTO financial_data (user_id, month, credit_card_bill, notes, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, month) 
       DO UPDATE SET 
         credit_card_bill = excluded.credit_card_bill,
         notes = excluded.notes,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, month, creditCardBill, notes || null]
    );

    const savedData = await db.get(
      'SELECT id, month, credit_card_bill as creditCardBill, notes FROM financial_data WHERE user_id = ? AND month = ?',
      [userId, month]
    );

    await db.close();

    return NextResponse.json({ finance: savedData });
  } catch (error) {
    console.error('Error saving financial data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}