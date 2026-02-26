declare global {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
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
