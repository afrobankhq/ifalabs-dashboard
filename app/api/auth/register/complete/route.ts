import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/register/complete
 * 
 * Completes the registration process after email verification.
 * This endpoint proxies the request to the Oracle Engine backend.
 * 
 * Request body:
 *   - token: string - The verification token from the email
 *   - name: string - User's full name
 *   - first_name: string - User's first name
 *   - last_name: string - User's last name
 *   - password: string - User's chosen password
 *   - description?: string - Optional user description
 *   - website?: string - Optional website URL
 * 
 * Response:
 *   - id: string - The created user ID
 *   - email: string - User's email address
 *   - message: string - Success message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, first_name, last_name, password, description, website } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get Oracle Engine backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      process.env.ORACLE_ENGINE_URL || 
                      'http://localhost:8000';

    const endpoint = process.env.NEXT_PUBLIC_AUTH_COMPLETE_REGISTER_PATH || '/api/auth/register/complete';
    const url = `${backendUrl}${endpoint}`;

    console.log('[Auth Complete] Completing registration at:', url);

    // Prepare payload for backend
    const payload: any = {
      token,
      name,
      first_name,
      last_name,
      password,
      description: description || '',
    };

    // Only include website if it's provided and valid
    if (website && website.trim() && website.trim() !== 'N/A') {
      payload.website = website.trim();
    }

    // Forward request to Oracle Engine backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Auth Complete] Backend error:', data);
      return NextResponse.json(
        { error: data.error || data.message || 'Failed to complete registration' },
        { status: response.status }
      );
    }

    console.log('[Auth Complete] Registration completed successfully');

    return NextResponse.json({
      id: data.id,
      email: data.email,
      message: data.message || 'Registration completed successfully',
    });

  } catch (error) {
    console.error('[Auth Complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete registration' },
      { status: 500 }
    );
  }
}

