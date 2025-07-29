import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword, validateEmail, validatePassword, validateName, sanitizeInput } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedName = sanitizeInput(name);

    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const nameValidation = validateName(sanitizedName);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.message },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmail(sanitizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(sanitizedEmail, passwordHash, sanitizedName);

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: { id: user.id, email: user.email, name: user.name }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
