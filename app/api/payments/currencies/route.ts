// app/api/payments/currencies/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Fallback currencies in case API is unavailable
const FALLBACK_CURRENCIES = ['usdcbase', 'btc', 'eth', 'usdt', 'ltc', 'ada', 'matic', 'bnb'];

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 10000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries reached');
}

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.NOWPAYMENTS_API_KEY) {
      console.warn('NOWPAYMENTS_API_KEY not configured, using fallback currencies');
      return NextResponse.json({ currencies: FALLBACK_CURRENCIES });
    }

    const response = await fetchWithRetry(
      'https://api.nowpayments.io/v1/currencies',
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        },
        cache: 'no-store',
      },
      2, // 2 retries
      5000 // 5 second timeout
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to show only popular cryptocurrencies
    const popularCurrencies = ['usdcbase', 'btc', 'eth', 'usdt', 'ltc', 'ada', 'matic', 'bnb'];
    const filteredCurrencies = data.currencies.filter((currency: string) => 
      popularCurrencies.includes(currency.toLowerCase())
    );

    return NextResponse.json({ currencies: filteredCurrencies });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    
    // Return fallback currencies instead of error
    console.warn('Using fallback currencies due to API error');
    return NextResponse.json({ 
      currencies: FALLBACK_CURRENCIES,
      fallback: true 
    });
  }
}

