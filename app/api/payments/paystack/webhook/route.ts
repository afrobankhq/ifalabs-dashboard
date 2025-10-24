// app/api/payments/paystack/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text();
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(body)
      .digest('hex');

    // Verify webhook signature
    const paystackSignature = request.headers.get('x-paystack-signature');
    
    if (hash !== paystackSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        console.log('Payment successful:', event.data);
        
        // Extract metadata
        const metadata = event.data.metadata;
        const reference = event.data.reference;
        const amount = event.data.amount / 100; // Convert from kobo to main unit
        const billingFrequency = metadata?.billing_frequency || 'monthly';
        
        console.log('Payment confirmed:', {
          reference,
          amount,
          plan_id: metadata?.plan_id,
          user_id: metadata?.user_id,
          billing_frequency: billingFrequency,
        });
        
        // Activate subscription in oracle_engine backend (this triggers email notification)
        if (metadata?.user_id && metadata?.plan_id) {
          try {
            const backendUrl = process.env.PROXY_UPSTREAM_URL || 'http://localhost:8000';
            
            // Call subscription activation endpoint (this sends the email)
            const activationResponse = await fetch(`${backendUrl}/api/subscriptions/activate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: metadata.user_id,
                plan_id: metadata.plan_id,
                billing_cycle: billingFrequency,
                payment_id: reference,
                amount_paid: amount,
                pay_currency: 'NGN', // Paystack uses Nigerian Naira
                order_id: reference,
              }),
            });

            if (activationResponse.ok) {
              const activationData = await activationResponse.json();
              console.log('✅ Subscription activated in oracle_engine backend:', activationData);
              console.log('✅ Activation email should have been sent to user');
            } else {
              const errorData = await activationResponse.json();
              console.error('❌ Failed to activate subscription in backend:', errorData);
              
              // Fallback: try to update subscription directly
              console.log('Attempting fallback subscription update...');
              const updateResponse = await fetch(`${backendUrl}/api/dashboard/${metadata.user_id}/subscription`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription_plan: metadata.plan_id,
              }),
            });

            if (updateResponse.ok) {
                console.log('✅ Subscription updated via fallback method (email may not be sent)');
            } else {
                const fallbackError = await updateResponse.json();
                console.error('❌ Fallback subscription update also failed:', fallbackError);
              }
            }
          } catch (error) {
            console.error('❌ Error activating subscription in backend:', error);
          }
        } else {
          console.error('❌ Missing required metadata for subscription activation:', {
            user_id: metadata?.user_id,
            plan_id: metadata?.plan_id,
          });
        }
        
        break;

      case 'charge.failed':
        console.log('Payment failed:', event.data);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

