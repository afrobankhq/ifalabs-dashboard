// app/api/payments/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const { planId, paymentMethod, billingFrequency, userId } = await request.json();

    if (!planId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user ID from request or token
    let userIdFromRequest = userId;
    
    // If no userId provided, try to get from session
    if (!userIdFromRequest) {
      try {
        const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
        userIdFromRequest = token?.sub || token?.id;
      } catch (e) {
        console.log('Could not extract user from token:', e);
      }
    }

    // Generate unique order ID with billing frequency and user ID
    const orderId = `sub_${planId}_${billingFrequency || 'monthly'}_${userIdFromRequest || 'guest'}_${uuidv4()}`;

    const paymentIntent = {
      order_id: orderId,
      plan_id: planId,
      user_id: userIdFromRequest,
      payment_method: paymentMethod,
      billing_frequency: billingFrequency || 'monthly',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
