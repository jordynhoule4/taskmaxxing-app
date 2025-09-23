import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create financial_data table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS financial_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        credit_card_bill DECIMAL NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, month)
      )
    `);

    // Create financial_settings table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS financial_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        monthly_income DECIMAL NOT NULL DEFAULT 0,
        rent DECIMAL NOT NULL DEFAULT 0,
        savings_goal DECIMAL NOT NULL DEFAULT 0,
        spending_limit DECIMAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id)
      )
    `);

    const financesResult = await query(
      'SELECT id, month, credit_card_bill as "creditCardBill", notes FROM financial_data WHERE user_id = $1 ORDER BY month DESC',
      [user.userId]
    );

    // Get user's financial settings
    const settingsResult = await query(
      'SELECT monthly_income as "monthlyIncome", rent, savings_goal as "savingsGoal", spending_limit as "spendingLimit" FROM financial_settings WHERE user_id = $1',
      [user.userId]
    );

    return NextResponse.json({
      finances: financesResult.rows,
      settings: settingsResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
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

    // Update financial settings if provided
    if (settings) {
      await query(
        `INSERT INTO financial_settings (user_id, monthly_income, rent, savings_goal, spending_limit, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id)
         DO UPDATE SET
           monthly_income = EXCLUDED.monthly_income,
           rent = EXCLUDED.rent,
           savings_goal = EXCLUDED.savings_goal,
           spending_limit = EXCLUDED.spending_limit,
           updated_at = CURRENT_TIMESTAMP`,
        [user.userId, settings.monthlyIncome || 0, settings.rent || 0, settings.savingsGoal || 0, settings.spendingLimit || 0]
      );
    }

    // Insert or update financial data
    const result = await query(
      `INSERT INTO financial_data (user_id, month, credit_card_bill, notes, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, month)
       DO UPDATE SET
         credit_card_bill = EXCLUDED.credit_card_bill,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, month, credit_card_bill as "creditCardBill", notes`,
      [user.userId, month, creditCardBill, notes || null]
    );

    return NextResponse.json({ finance: result.rows[0] });
  } catch (error) {
    console.error('Error saving financial data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}