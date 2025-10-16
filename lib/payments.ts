// lib/payment.ts
import { 
    PaymentRequest, 
    PaymentResponse, 
    PaymentStatus, 
    PaymentIntent, 
    EstimatedPrice,
    CryptoCurrency 
  } from '@/types/payments';
  
  class NOWPaymentsService {
    private baseURL = 'https://api.nowpayments.io/v1';
    private sandboxURL = 'https://api-sandbox.nowpayments.io/v1';
    private apiKey: string;
    private useSandbox: boolean;
  
    constructor(apiKey: string, useSandbox: boolean = false) {
      this.apiKey = apiKey;
      this.useSandbox = useSandbox;
    }
  
    private get apiURL() {
      return this.useSandbox ? this.sandboxURL : this.baseURL;
    }
  
    private async makeRequest<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const url = `${this.apiURL}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          ...options.headers,
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `NOWPayments API Error: ${response.status} - ${
            errorData.message || 'Unknown error'
          }`
        );
      }
  
      return response.json();
    }
  
    async getAvailableCurrencies(): Promise<{ currencies: string[] }> {
      return this.makeRequest('/currencies');
    }
  
    async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
      return this.makeRequest('/payment', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    }
  
    async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
      return this.makeRequest(`/payment/${paymentId}`);
    }
  
    async getEstimatedPrice(
      amount: number,
      currency_from: string,
      currency_to: string
    ): Promise<EstimatedPrice> {
      return this.makeRequest(
        `/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`
      );
    }
  
    async getMinPaymentAmount(currency_from: string, currency_to: string): Promise<{ min_amount: number }> {
      return this.makeRequest(`/min-amount?currency_from=${currency_from}&currency_to=${currency_to}`);
    }
  }
  
  // Payment API Service for frontend
  export const paymentApiService = {
  // Create payment intent
  createPaymentIntent: async (planId: string, paymentMethod: 'crypto' | 'traditional', billingFrequency: 'monthly' | 'annual' = 'monthly', userId?: string): Promise<PaymentIntent> => {
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, paymentMethod, billingFrequency, userId }),
    });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }
  
      return response.json();
    },
  
    // Create NOWPayments payment
    createNOWPayment: async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
      const response = await fetch('/api/payments/nowpayments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }
  
      return response.json();
    },
  
    // Get payment status
    getPaymentStatus: async (paymentId: string): Promise<PaymentStatus> => {
      const response = await fetch(`/api/payments/nowpayments/status/${paymentId}`, {
        method: 'GET',
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment status');
      }
  
      return response.json();
    },
  
    // Verify payment and update subscription
    verifyPayment: async (paymentId: string): Promise<{ success: boolean; payment_status: string; plan_id?: string }> => {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }
  
      return response.json();
    },
  
    // Get supported crypto currencies
    getSupportedCurrencies: async (): Promise<{ currencies: string[] }> => {
      const response = await fetch('/api/payments/currencies');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get supported currencies');
      }
  
      return response.json();
    },
  
    // Get estimated price for crypto conversion
    getEstimatedPrice: async (
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<EstimatedPrice> => {
      const response = await fetch(
        `/api/payments/estimate?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get estimated price');
      }
  
      return response.json();
    },
  };
  
  // Initialize NOWPayments service
  export const nowPaymentsService = new NOWPaymentsService(
    process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY || '',
    process.env.NODE_ENV === 'development' // Use sandbox in development
  );
  
  // Utility functions
  export const formatCurrency = (amount: number, currency: string): string => {
    if (currency.toLowerCase() === 'usd') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }
    
    // For crypto currencies, show with appropriate decimal places
    const cryptoDecimals = getCryptoDecimals(currency);
    return `${amount.toFixed(cryptoDecimals)} ${currency.toUpperCase()}`;
  };
  
  export const getCryptoDecimals = (currency: string): number => {
    const decimals: Record<string, number> = {
      btc: 8,
      eth: 6,
      usdt: 2,
      usdc: 2,
      ltc: 8,
      ada: 6,
      matic: 4,
      bnb: 4,
    };
    
    return decimals[currency.toLowerCase()] || 8;
  };
  
  export const getPaymentStatusColor = (status: PaymentStatus['payment_status']): string => {
    switch (status) {
      case 'waiting':
      case 'partially_paid':
        return 'text-yellow-600';
      case 'confirming':
      case 'sending':
        return 'text-blue-600';
      case 'confirmed':
      case 'finished':
        return 'text-green-600';
      case 'failed':
      case 'refunded':
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  export const getPaymentStatusText = (status: PaymentStatus['payment_status']): string => {
    switch (status) {
      case 'waiting':
        return 'Waiting for Payment';
      case 'confirming':
        return 'Confirming Payment';
      case 'confirmed':
        return 'Payment Confirmed';
      case 'sending':
        return 'Sending Payment';
      case 'partially_paid':
        return 'Partially Paid';
      case 'finished':
        return 'Payment Complete';
      case 'failed':
        return 'Payment Failed';
      case 'refunded':
        return 'Payment Refunded';
      case 'expired':
        return 'Payment Expired';
      default:
        return 'Unknown Status';
    }
  };
  
  // Payment polling utility
  export class PaymentStatusPoller {
    private paymentId: string;
    private onStatusChange: (status: PaymentStatus) => void;
    private onComplete: (status: PaymentStatus) => void;
    private onError: (error: Error) => void;
    private pollInterval: number;
    private maxAttempts: number;
    private currentAttempts: number = 0;
    private intervalId: NodeJS.Timeout | null = null;
  
    constructor({
      paymentId,
      onStatusChange,
      onComplete,
      onError,
      pollInterval = 5000, // 5 seconds
      maxAttempts = 60, // 5 minutes total
    }: {
      paymentId: string;
      onStatusChange: (status: PaymentStatus) => void;
      onComplete: (status: PaymentStatus) => void;
      onError: (error: Error) => void;
      pollInterval?: number;
      maxAttempts?: number;
    }) {
      this.paymentId = paymentId;
      this.onStatusChange = onStatusChange;
      this.onComplete = onComplete;
      this.onError = onError;
      this.pollInterval = pollInterval;
      this.maxAttempts = maxAttempts;
    }
  
    start(): void {
      this.poll();
    }
  
    stop(): void {
      if (this.intervalId) {
        clearTimeout(this.intervalId);
        this.intervalId = null;
      }
    }
  
    private async poll(): Promise<void> {
      try {
        const status = await paymentApiService.getPaymentStatus(this.paymentId);
        this.onStatusChange(status);
  
        // Check if payment is in a final state
        if (
          status.payment_status === 'confirmed' ||
          status.payment_status === 'finished' ||
          status.payment_status === 'failed' ||
          status.payment_status === 'refunded' ||
          status.payment_status === 'expired'
        ) {
          this.onComplete(status);
          return;
        }
  
        // Continue polling if not in final state and under max attempts
        this.currentAttempts++;
        if (this.currentAttempts < this.maxAttempts) {
          this.intervalId = setTimeout(() => this.poll(), this.pollInterval);
        } else {
          this.onError(new Error('Payment status polling timeout'));
        }
      } catch (error) {
        this.onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
  }