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
    console.log('[Auth Initiate] Starting registration initiation');
    
    const body = await request.json();
    console.log('[Auth Initiate] Request body received:', body);
    
    const { email } = body;
    console.log('[Auth Initiate] Email extracted:', email);

    if (!email) {
      console.error('[Auth Initiate] Email is missing');
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('[Auth Initiate] Invalid email format:', email);
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

    console.log('[Auth Initiate] Backend URL:', backendUrl);
    console.log('[Auth Initiate] Endpoint:', endpoint);
    console.log('[Auth Initiate] Full URL:', url);
    console.log('[Auth Initiate] Sending verification email request to:', url);

    // Forward request to Oracle Engine backend
    console.log('[Auth Initiate] Making fetch request...');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('[Auth Initiate] Response status:', response.status);
      console.log('[Auth Initiate] Response ok:', response.ok);
      console.log('[Auth Initiate] Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('[Auth Initiate] Response data:', data);

      if (!response.ok) {
        console.error('[Auth Initiate] Backend error - Status:', response.status);
        console.error('[Auth Initiate] Backend error - Data:', data);
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
    } catch (fetchError) {
      console.error('[Auth Initiate] Fetch error caught:', fetchError);
      console.error('[Auth Initiate] Fetch error type:', typeof fetchError);
      console.error('[Auth Initiate] Fetch error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      console.error('[Auth Initiate] Fetch error stack:', fetchError instanceof Error ? fetchError.stack : 'No stack trace');
      throw fetchError;
    }

  } catch (error) {
    console.error('[Auth Initiate] Outer catch block - Error:', error);
    console.error('[Auth Initiate] Error type:', typeof error);
    console.error('[Auth Initiate] Error instanceof Error:', error instanceof Error);
    console.error('[Auth Initiate] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Auth Initiate] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to send verification email',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

