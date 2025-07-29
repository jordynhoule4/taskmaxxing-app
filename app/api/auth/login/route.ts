import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword, createToken, sanitizeInput } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    const user = await getUserByEmail(sanitizedEmail);
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    const response = NextResponse.json(
      { 
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name }
      },
      { status: 200 }
    );

    // Set cookie duration based on remember me option
    let maxAge;
    if (rememberMe === 'forever') {
      maxAge = 365 * 24 * 60 * 60; // 1 year in seconds
    } else if (rememberMe === 'week') {
      maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    } else {
      maxAge = 24 * 60 * 60; // 1 day in seconds
    }

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
