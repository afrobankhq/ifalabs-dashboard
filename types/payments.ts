// types/payment.ts
export interface PaymentRequest {
    price_amount: number;
    price_currency: string;
    pay_currency: string;
    order_id: string;
    order_description: string;
    ipn_callback_url: string;
    success_url: string;
    cancel_url: string;
  }
  
  export interface PaymentResponse {
    payment_id: string;
    payment_status: string;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    purchase_id: string;
    created_at: string;
    updated_at: string;
    payment_url: string;
  }
  
  export interface PaymentStatus {
    payment_id: string;
    payment_status: 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired';
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    actually_paid: number;
    order_id: string;
    order_description: string;
    purchase_id: string;
    outcome_amount: number;
    outcome_currency: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CryptoCurrency {
    code: string;
    name: string;
    logo?: string;
  }
  
  export interface PaymentIntent {
    order_id: string;
    plan_id: string;
    payment_method: 'crypto' | 'traditional';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
  }
  
  export interface EstimatedPrice {
    currency_from: string;
    currency_to: string;
    estimated_amount: number;
    amount_from: number;
    amount_to: number;
  }
  
  export interface WebhookPayload {
    payment_id: string;
    payment_status: PaymentStatus['payment_status'];
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    pay_currency: string;
    actually_paid: number;
    order_id: string;
    order_description: string;
    purchase_id: string;
    outcome_amount: number;
    outcome_currency: string;
  }
  
  export interface Plan {
    id: string;
    name: string;
    price: number | string;
    priceDescription?: string;
    description: string;
    features: {
      dataAccess: string;
      apiRequests: string;
      rateLimit: string;
      requestCall: string;
      support: string;
    };
    popular?: boolean;
    current?: boolean;
  }
  
  export type PaymentDialogStep = 'select' | 'payment' | 'confirmation';
  export type PaymentStatusType = 'pending' | 'confirming' | 'confirmed' | 'failed';