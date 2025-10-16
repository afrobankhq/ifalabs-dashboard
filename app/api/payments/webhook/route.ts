// app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-nowpayments-sig');
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const paymentData = JSON.parse(body);
    
    console.log('Payment webhook received:', paymentData);

    // Handle different payment statuses
    switch (paymentData.payment_status) {
      case 'confirming':
        // Payment is being confirmed on the blockchain
        await handleConfirmingPayment(paymentData);
        break;
        
      case 'confirmed':
      case 'finished':
        // Payment is confirmed - upgrade the subscription
        await handleConfirmedPayment(paymentData);
        break;
        
      case 'failed':
      case 'refunded':
        // Payment failed - handle accordingly
        await handleFailedPayment(paymentData);
        break;
        
      default:
        console.log('Unknown payment status:', paymentData.payment_status);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleConfirmingPayment(paymentData: any) {
  try {
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:8000';

    // Update payment status in backend
    await fetch(`${backendUrl}/api/payments/${paymentData.payment_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: paymentData.payment_id,
        status: 'confirming',
      }),
    });
    
    console.log('Payment confirming:', paymentData.payment_id);
  } catch (error) {
    console.error('Error handling confirming payment:', error);
  }
}

async function handleConfirmedPayment(paymentData: any) {
  try {
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:8000';

    // Extract plan ID and billing cycle from order ID
    // Format: sub_{planId}_{billingFreq}_{userId}_{uuid}
    const orderIdParts = paymentData.order_id.split('_');
    const planId = orderIdParts[1];
    const billingFreq = orderIdParts[2] || 'monthly';
    const userId = orderIdParts[3];

    // Activate subscription in backend
    const activationResponse = await fetch(`${backendUrl}/api/subscriptions/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        plan_id: planId,
        billing_cycle: billingFreq,
        payment_id: paymentData.payment_id,
        amount_paid: paymentData.actually_paid || paymentData.price_amount,
        pay_currency: paymentData.pay_currency,
        order_id: paymentData.order_id,
      }),
    });

    if (!activationResponse.ok) {
      const error = await activationResponse.json();
      console.error('Failed to activate subscription:', error);
      throw new Error(error.error || 'Subscription activation failed');
    }

    const activationData = await activationResponse.json();
    console.log('Subscription activated successfully:', activationData);
    
  } catch (error) {
    console.error('Error handling confirmed payment:', error);
    // Even if backend fails, log the payment data for manual processing
    console.error('Payment data for manual processing:', {
      payment_id: paymentData.payment_id,
      order_id: paymentData.order_id,
      amount: paymentData.actually_paid,
    });
  }
}

async function handleFailedPayment(paymentData: any) {
  try {
    const backendUrl = process.env.PROXY_UPSTREAM_URL || 
                       process.env.NEXT_PUBLIC_API_URL || 
                       'http://localhost:8000';

    // Update payment status in backend
    await fetch(`${backendUrl}/api/payments/${paymentData.payment_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: paymentData.payment_id,
        status: paymentData.payment_status,
      }),
    });

    console.log('Payment failed:', paymentData.payment_id);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

