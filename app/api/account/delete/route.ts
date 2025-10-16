import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/account/delete
 * 
 * Handles account deletion by proxying to Oracle Engine backend.
 * This ensures the account is deleted from the database before clearing local storage.
 * 
 * Query params:
 *   - userId: The ID of the user to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Get userId from query params or request body
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');

    if (!userId) {
      // Try to get from body
      try {
        const body = await request.json();
        userId = body.userId;
      } catch {
        // Body parsing failed, userId not found
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[Account Delete] Account deletion requested for user:', userId);

    // Call Oracle Engine backend to delete the account
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      'http://localhost:8000';
    
    const deleteUrl = `${backendUrl}/api/dashboard/${userId}/profile`;
    
    console.log('[Account Delete] Calling backend DELETE endpoint:', deleteUrl);

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Account Delete] Backend deletion failed:', errorData);
      
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete account from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Account Delete] Backend deletion successful:', data);

    return NextResponse.json({
      data: { 
        id: userId,
        deleted: true,
        timestamp: new Date().toISOString()
      },
      message: data.message || 'Account deleted successfully'
    });

  } catch (error) {
    console.error('[Account Delete] Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

