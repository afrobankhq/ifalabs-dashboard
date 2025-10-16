import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/register/initiate
 * 
 * Initiates the registration process by sending a verification email.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Request body:
 *   - email: string - The email address to send verification link to
 * 
 * Response:
 *   - message: string - Success message
 *   - email: string - The email address that was sent the verification link
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

    const endpoint = process.env.NEXT_PUBLIC_AUTH_INITIATE_REGISTER_PATH || '/api/auth/register/initiate';
    const url = `${backendUrl}${endpoint}`;

    console.log('[Auth Initiate] Sending verification email request to:', url);

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
      console.error('[Auth Initiate] Backend error:', data);
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to send verification email' },
        { status: response.status }
      );
    }

    console.log('[Auth Initiate] Verification email sent successfully to:', email);

    return NextResponse.json({
      message: data.message || 'Verification email sent successfully',
      email: email,
    });

  } catch (error) {
    console.error('[Auth Initiate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

