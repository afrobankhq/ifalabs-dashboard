import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/password/reset
 * 
 * Resets a user's password using a valid reset token.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Request body:
 *   - token: string - The password reset token from the email link
 *   - password: string - The new password
 * 
 * Response:
 *   - message: string - Success message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Get Oracle Engine backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      process.env.ORACLE_ENGINE_URL || 
                      'http://localhost:8000';

    const endpoint = process.env.NEXT_PUBLIC_AUTH_RESET_PASSWORD_PATH || '/api/auth/password/reset';
    const url = `${backendUrl}${endpoint}`;

    console.log('[Password Reset] Resetting password at:', url);

    // Forward request to Oracle Engine backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Password Reset] Backend error:', data);
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to reset password' },
        { status: response.status }
      );
    }

    console.log('[Password Reset] Password reset successfully');

    return NextResponse.json({
      message: data.message || 'Password reset successfully',
    });

  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

