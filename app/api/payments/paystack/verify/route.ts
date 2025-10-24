// app/api/payments/paystack/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, invoice_id, user_id, amount, payment_type } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Check if Paystack secret key is configured
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Paystack not configured' },
        { status: 500 }
      );
    }

    // Verify the transaction with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      console.error('Paystack Verification Error:', errorData);
      throw new Error(errorData.message || 'Failed to verify payment');
    }

    const paystackData = await paystackResponse.json();

    if (paystackData.status && paystackData.data) {
      const transaction = paystackData.data;
      
      // If payment is successful, handle based on payment type
      if (transaction.status === 'success' && transaction.metadata) {
        const metadata = transaction.metadata;
        const backendUrl = process.env.PROXY_UPSTREAM_URL || 'http://localhost:8000';
        
        console.log('Payment verified successfully, processing payment...');
        console.log('Metadata:', metadata);
        console.log('Payment type:', payment_type);
        
        if (payment_type === 'invoice' && invoice_id && user_id) {
          // Handle invoice payment
          try {
            console.log('Processing invoice payment:', { invoice_id, user_id, amount });
            
            // Mark invoice as paid
            const invoiceResponse = await fetch(`${backendUrl}/api/dashboard/${user_id}/invoices/${invoice_id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'paid',
                payment_id: transaction.reference,
                paid_at: new Date().toISOString(),
              }),
            });

            if (invoiceResponse.ok) {
              console.log('✅ Invoice marked as paid successfully');
            } else {
              const errorData = await invoiceResponse.json();
              console.error('❌ Failed to mark invoice as paid:', errorData);
            }
          } catch (error) {
            console.error('❌ Error processing invoice payment:', error);
          }
        } else if (payment_type === 'subscription' || (!payment_type && metadata.user_id && metadata.plan_id && metadata.billing_frequency)) {
          // Handle subscription payment (existing logic)
          try {
            const activationResponse = await fetch(`${backendUrl}/api/subscriptions/activate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: metadata.user_id,
                plan_id: metadata.plan_id,
                billing_cycle: metadata.billing_frequency,
                payment_id: transaction.reference,
                amount_paid: transaction.amount / 100, // Convert from kobo to main unit
                pay_currency: transaction.currency,
                order_id: transaction.reference,
              }),
            });

            if (activationResponse.ok) {
              const activationData = await activationResponse.json();
              console.log('✅ Subscription activated successfully:', activationData);
              console.log('✅ Activation email should have been sent to user');
            } else {
              const errorData = await activationResponse.json();
              console.error('❌ Failed to activate subscription:', errorData);
            }
          } catch (error) {
            console.error('❌ Error activating subscription:', error);
          }
        } else {
          console.warn('⚠️ Unknown payment type or missing required data:', {
            payment_type,
            invoice_id,
            user_id,
            metadata_user_id: metadata?.user_id,
            metadata_plan_id: metadata?.plan_id,
            metadata_billing_frequency: metadata?.billing_frequency,
          });
        }
      }
      
      return NextResponse.json({
        status: transaction.status,
        reference: transaction.reference,
        amount: transaction.amount / 100, // Convert from kobo/cents to main unit
        currency: transaction.currency,
        paid_at: transaction.paid_at,
        channel: transaction.channel,
        metadata: transaction.metadata,
        customer: {
          email: transaction.customer.email,
        },
      });
    } else {
      throw new Error('Invalid response from Paystack');
    }
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to verify payment'
      },
      { status: 500 }
    );
  }
}

