declare global {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    PAYSTACK_SECRET_KEY?: string;
    PAYSTACK_CURRENCY?: string;
    RESEND_API_KEY?: string;
    ORDER_FROM_EMAIL?: string;
    ORDER_OWNER_EMAIL?: string;
    ORDER_ADMIN_TOKEN?: string;
    SITE_URL?: string;
    FIREBASE_PROJECT_ID?: string;
    PAYFAST_MERCHANT_ID: string;
    PAYFAST_MERCHANT_KEY: string;
    PAYFAST_PASSPHRASE?: string;
    PAYFAST_RETURN_URL?: string;
    PAYFAST_CANCEL_URL?: string;
    PAYFAST_NOTIFY_URL?: string;
    PAYFAST_PROCESS_URL?: string;
    PAYFAST_VALIDATE_URL?: string;
  }
}

export {};
