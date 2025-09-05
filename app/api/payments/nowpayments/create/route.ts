
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
    
    // Store payment in your database
    // await fetch('http://your-golang-api/api/payments', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     payment_id: payment.payment_id,
    //     order_id: payment.order_id,
    //     amount: payment.price_amount,
    //     currency: payment.price_currency,
    //     pay_currency: payment.pay_currency,
    //     status: payment.payment_status,
    //   }),
    // });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error creating NOWPayments payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

