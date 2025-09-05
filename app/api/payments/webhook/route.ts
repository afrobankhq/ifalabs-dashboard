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
    // Update payment status in your database
    // await fetch('http://your-golang-api/api/payments/update-status', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     payment_id: paymentData.payment_id,
    //     status: 'confirming',
    //   }),
    // });
    
    console.log('Payment confirming:', paymentData.payment_id);
  } catch (error) {
    console.error('Error handling confirming payment:', error);
  }
}

async function handleConfirmedPayment(paymentData: any) {
  try {
    // Extract plan ID from order ID
    const orderIdParts = paymentData.order_id.split('_');
    const planId = orderIdParts[1]; // Assuming format: sub_planId_uuid

    // Update subscription in your Golang API
    // await fetch('http://your-golang-api/api/subscriptions/activate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     order_id: paymentData.order_id,
    //     payment_id: paymentData.payment_id,
    //     plan_id: planId,
    //     amount_paid: paymentData.actually_paid,
    //     currency: paymentData.pay_currency,
    //   }),
    // });

    // Update payment status
    // await fetch('http://your-golang-api/api/payments/update-status', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     payment_id: paymentData.payment_id,
    //     status: 'confirmed',
    //   }),
    // });

    console.log('Subscription activated for payment:', paymentData.payment_id);
    
    // Optionally send confirmation email
    // await sendSubscriptionConfirmationEmail(userEmail, planId);
    
  } catch (error) {
    console.error('Error handling confirmed payment:', error);
  }
}

async function handleFailedPayment(paymentData: any) {
  try {
    // Update payment status
    // await fetch('http://your-golang-api/api/payments/update-status', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     payment_id: paymentData.payment_id,
    //     status: 'failed',
    //   }),
    // });

    // Clean up any pending subscriptions
    // await fetch('http://your-golang-api/api/subscriptions/cancel-pending', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     order_id: paymentData.order_id,
    //   }),
    // });

    console.log('Payment failed:', paymentData.payment_id);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

