// app/api/dashboard/[id]/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    // Get the backend URL
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:8000';

    console.log('Change password request for user:', id);
    console.log('Backend URL:', backendUrl);

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/dashboard/${id}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!,
        }),
      },
      body: JSON.stringify({
        current_password: body.current_password,
        new_password: body.new_password,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Password change failed:', responseData);
      return NextResponse.json(
        responseData,
        { status: response.status }
      );
    }

    console.log('✅ Password changed successfully');
    console.log('✅ Backend should have sent password change email');

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}

