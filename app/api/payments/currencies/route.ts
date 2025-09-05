// app/api/payments/currencies/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.nowpayments.io/v1/currencies', {
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }

    const data = await response.json();
    
    // Filter to show only popular cryptocurrencies
    const popularCurrencies = ['btc', 'eth', 'usdt', 'usdc', 'ltc', 'ada', 'matic', 'bnb'];
    const filteredCurrencies = data.currencies.filter((currency: string) => 
      popularCurrencies.includes(currency.toLowerCase())
    );

    return NextResponse.json({ currencies: filteredCurrencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supported currencies' },
      { status: 500 }
    );
  }
}

