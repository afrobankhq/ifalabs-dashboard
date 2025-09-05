// app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get payment status from NOWPayments
    const response = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment');
    }

    const paymentData = await response.json();
    
    // Check if payment is confirmed
    if (paymentData.payment_status === 'confirmed' || paymentData.payment_status === 'finished') {
      // Extract plan ID from order ID
      const orderIdParts = paymentData.order_id.split('_');
      const planId = orderIdParts[1];

      // Update subscription in your Golang API
      // const subscriptionResponse = await fetch('http://your-golang-api/api/subscriptions/activate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     order_id: paymentData.order_id,
      //     payment_id: paymentData.payment_id,
      //     plan_id: planId,
      //   }),
      // });

      return NextResponse.json({
        success: true,
        payment_status: paymentData.payment_status,
        plan_id: planId,
      });
    }

    return NextResponse.json({
      success: false,
      payment_status: paymentData.payment_status,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

