
// app/api/payments/nowpayments/create/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const paymentData = await request.json();

    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('NOWPayments API Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to create payment' },
        { status: response.status }
      );
    }

    const payment = await response.json();
    
    // Store payment in backend database
    try {
      const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                        process.env.NEXT_PUBLIC_API_URL || 
                        'http://localhost:8000';

      await fetch(`${backendUrl}/api/payments/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: payment.payment_id,
          order_id: payment.order_id,
          amount: payment.price_amount,
          currency: payment.price_currency,
          pay_currency: payment.pay_currency,
          status: payment.payment_status,
          pay_address: payment.pay_address,
          pay_amount: payment.pay_amount,
          actually_paid: payment.actually_paid || 0,
          price_amount: payment.price_amount,
          price_currency: payment.price_currency,
        }),
      });
    } catch (storageError) {
      console.error('Failed to store payment in backend:', storageError);
      // Don't fail payment creation if storage fails
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error creating NOWPayments payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

