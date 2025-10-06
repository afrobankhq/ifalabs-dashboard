// app/api/payments/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { planId, paymentMethod, billingFrequency } = await request.json();

    if (!planId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique order ID with billing frequency
    const orderId = `sub_${planId}_${billingFrequency || 'monthly'}_${uuidv4()}`;

    // Store payment intent in your database or cache
    // This is where you'd typically save the payment intent to your database
    const paymentIntent = {
      order_id: orderId,
      plan_id: planId,
      payment_method: paymentMethod,
      billing_frequency: billingFrequency || 'monthly',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Here you would typically call your Golang API to create a pending subscription
    // await fetch('http://your-golang-api/api/subscriptions/pending', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(paymentIntent),
    // });

    return NextResponse.json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
