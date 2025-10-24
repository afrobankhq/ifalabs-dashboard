// app/api/payments/paystack/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    console.log('Request content-type:', contentType);
    
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    
    if (!rawBody || rawBody.trim() === '') {
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }
    
    const body = JSON.parse(rawBody);
    console.log('Parsed body:', body);
    
    const { email, amount, currency, reference, callback_url, metadata } = body;

    // Validate required fields
    if (!email || !amount || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, reference' },
        { status: 400 }
      );
    }

    // Check if Paystack secret key is configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Paystack not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount, // Amount in kobo/cents
        currency: currency || 'NGN',
        reference,
        callback_url,
        metadata,
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack API Error:', errorData);
      throw new Error(errorData.message || 'Failed to initialize payment with Paystack');
    }

    const paystackData = await paystackResponse.json();

    if (paystackData.status && paystackData.data) {
      return NextResponse.json({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      });
    } else {
      throw new Error('Invalid response from Paystack');
    }
  } catch (error) {
    console.error('Error initializing Paystack payment:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

