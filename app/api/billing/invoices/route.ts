// app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const invoiceData = await request.json();
    
    console.log('Invoice creation request received:', invoiceData);

    // Validate required fields
    const requiredFields = ['user_id', 'plan_name', 'amount', 'currency'];
    for (const field of requiredFields) {
      if (!invoiceData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate invoice ID
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create invoice record
    const invoice = {
      id: invoiceId,
      ...invoiceData,
      invoice_number: invoiceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Invoice created successfully:', invoiceId);
    console.log('Plan:', invoiceData.plan_name, 'Amount:', invoiceData.amount, invoiceData.currency);

    // Here you would typically:
    // 1. Store invoice in your database
    // 2. Send invoice email to user
    // 3. Update billing records
    // 4. Generate PDF invoice if needed

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoice: invoice,
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
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

    // Here you would typically fetch invoices from your database
    // For now, we'll return mock data
    const mockInvoices = [
      {
        id: 'INV-001',
        user_id: userId,
        plan_name: 'Developer Tier',
        amount: 50.00,
        currency: 'USD',
        status: 'paid',
        description: 'Developer Tier - Initial Payment',
        payment_id: 'payment_123',
        transaction_hash: 'tx_hash_123',
        created_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      invoices: mockInvoices,
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

