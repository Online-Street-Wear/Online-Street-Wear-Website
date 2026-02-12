declare global {
  interface Env {
    DB: D1Database;
    R2_BUCKET: R2Bucket;
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
  }
}

export {};
