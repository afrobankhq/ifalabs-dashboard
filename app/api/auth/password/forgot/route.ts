import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/password/forgot
 * 
 * Initiates the password reset process by sending a reset email.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Request body:
 *   - email: string - The email address to send password reset link to
 * 
 * Response:
 *   - message: string - Success message
 *   - email: string - The email address that was sent the reset link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Get Oracle Engine backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      process.env.ORACLE_ENGINE_URL || 
                      'http://localhost:8000';

    const endpoint = process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_PATH || '/api/auth/password/forgot';
    const url = `${backendUrl}${endpoint}`;

    console.log('[Forgot Password] Sending reset email request to:', url);

    // Forward request to Oracle Engine backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Forgot Password] Backend error:', data);
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to send password reset email' },
        { status: response.status }
      );
    }

    console.log('[Forgot Password] Reset email sent successfully to:', email);

    return NextResponse.json({
      message: data.message || 'Password reset email sent successfully',
      email: email,
    });

  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}

