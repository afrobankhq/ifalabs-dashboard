import { NextRequest, NextResponse } from 'next/server';

// Get the upstream backend URL from environment variables
const getUpstreamUrl = () => {
  const upstream = 
    process.env.PROXY_UPSTREAM_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';
  
  // Ensure no trailing slash
  return upstream.replace(/\/$/, '');
};

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

    // Forward request directly to backend using PROXY_UPSTREAM_URL
    const upstreamUrl = getUpstreamUrl();
    const backendEndpoint = '/api/auth/register/initiate';
    const proxyUrl = `${upstreamUrl}${backendEndpoint}`;

    console.log('[Auth Initiate] Upstream URL:', upstreamUrl);
    console.log('[Auth Initiate] Backend endpoint:', backendEndpoint);
    console.log('[Auth Initiate] Full URL:', proxyUrl);

    // Forward request to Oracle Engine backend
    console.log('[Auth Initiate] Making fetch request...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('[Auth Initiate] Response status:', response.status);
      console.log('[Auth Initiate] Response ok:', response.ok);
      console.log('[Auth Initiate] Response headers:', Object.fromEntries(response.headers.entries()));

      // Get the raw response text first
      const textResponse = await response.text();
      console.log('[Auth Initiate] Raw response text (first 500 chars):', textResponse.substring(0, 500));
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('[Auth Initiate] Response content-type:', contentType);
      
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(textResponse);
          console.log('[Auth Initiate] Response data:', data);
        } catch (parseError) {
          console.error('[Auth Initiate] Failed to parse JSON:', parseError);
          console.error('[Auth Initiate] Raw text:', textResponse);
          throw new Error(`Backend returned invalid JSON. Status: ${response.status}. Response: ${textResponse.substring(0, 200)}`);
        }
      } else {
        // If not JSON, log what we received
        console.error('[Auth Initiate] Non-JSON response received');
        console.error('[Auth Initiate] Status:', response.status);
        console.error('[Auth Initiate] Content-Type:', contentType);
        console.error('[Auth Initiate] Body:', textResponse);
        throw new Error(`Backend returned non-JSON response (${response.status}). Content-Type: ${contentType}. Body: ${textResponse.substring(0, 200)}`);
      }

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
      
      // Check if it's a timeout error
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timed out while connecting to the backend. Please try again.');
      }
      
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

