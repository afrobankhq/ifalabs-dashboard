// app/api/payments/nowpayments/status/[paymentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const response = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }

    const paymentStatus = await response.json();
    return NextResponse.json(paymentStatus);
  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}

