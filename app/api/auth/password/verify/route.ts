import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/password/verify?token=xxx
 * 
 * Verifies a password reset token.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Query params:
 *   - token: string - The password reset token from the email link
 * 
 * Response:
 *   - valid: boolean - Whether the token is valid
 *   - email: string - The email address associated with the token (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Reset token is required' 
        },
        { status: 400 }
      );
    }

    // Get Oracle Engine backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      process.env.ORACLE_ENGINE_URL || 
                      'http://localhost:8000';

    const endpoint = process.env.NEXT_PUBLIC_AUTH_VERIFY_RESET_PASSWORD_PATH || '/api/auth/password/verify';
    const url = `${backendUrl}${endpoint}?token=${encodeURIComponent(token)}`;

    console.log('[Password Verify] Verifying reset token at:', url);

    // Forward request to Oracle Engine backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Password Verify] Backend error:', data);
      return NextResponse.json(
        { 
          valid: false,
          error: data.error || data.message || 'Invalid or expired reset token' 
        },
        { status: response.status }
      );
    }

    console.log('[Password Verify] Token verified successfully');

    return NextResponse.json({
      valid: true,
      email: data.email,
    });

  } catch (error) {
    console.error('[Password Verify] Error:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Failed to verify reset token' 
      },
      { status: 500 }
    );
  }
}

