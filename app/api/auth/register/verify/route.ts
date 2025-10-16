import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/register/verify?token=xxx
 * 
 * Verifies an email verification token.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Query params:
 *   - token: string - The verification token from the email link
 * 
 * Response:
 *   - valid: boolean - Whether the token is valid
 *   - email: string - The email address associated with the token
 *   - token: string - The verification token (to use in complete registration)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Get Oracle Engine backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      process.env.ORACLE_ENGINE_URL || 
                      'http://localhost:8000';

    const endpoint = process.env.NEXT_PUBLIC_AUTH_VERIFY_REGISTER_PATH || '/api/auth/register/verify';
    const url = `${backendUrl}${endpoint}?token=${encodeURIComponent(token)}`;

    console.log('[Auth Verify] Verifying token at:', url);

    // Forward request to Oracle Engine backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth Verify] Backend error:', data);
      return NextResponse.json(
        { 
          valid: false,
          error: data.error || data.message || 'Invalid or expired verification token' 
        },
        { status: response.status }
      );
    }

    console.log('[Auth Verify] Token verified successfully');

    return NextResponse.json({
      valid: true,
      email: data.email,
      token: token,
    });

  } catch (error) {
    console.error('[Auth Verify] Error:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Failed to verify token' 
      },
      { status: 500 }
    );
  }
}

