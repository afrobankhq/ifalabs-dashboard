// app/api/billing/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const billingData = await request.json();
    
    console.log('Billing setup request received:', billingData);

    // Validate required fields
    const requiredFields = ['user_id', 'plan_id', 'plan_name', 'amount', 'currency'];
    for (const field of requiredFields) {
      if (!billingData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Here you would typically:
    // 1. Store billing information in your database
    // 2. Set up recurring billing if needed
    // 3. Configure payment method
    // 4. Send confirmation email
    
    // For now, we'll just log the data and return success
    console.log('Billing setup completed for user:', billingData.user_id);
    console.log('Plan:', billingData.plan_name, 'Amount:', billingData.amount, billingData.currency);
    console.log('Next billing date:', billingData.next_billing_date);

    // Simulate database storage
    const billingRecord = {
      id: `billing_${Date.now()}`,
      ...billingData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Billing information setup successfully',
      billing_record: billingRecord,
    });

  } catch (error) {
    console.error('Error setting up billing:', error);
    return NextResponse.json(
      { error: 'Failed to setup billing information' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Here you would typically fetch billing information from your database
    // For now, we'll return mock data
    const mockBillingInfo = {
      user_id: userId,
      current_plan: 'developer',
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      payment_method: 'cryptocurrency',
    };

    return NextResponse.json({
      success: true,
      billing_info: mockBillingInfo,
    });

  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}

