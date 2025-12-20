/**
 * Application Configuration
 * 
 * Centralized configuration object for environment variables
 * 
 * Usage:
 * import config from "@/lib/config";
 * const dbUrl = config.env.databaseUrl;
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_*: Exposed to client-side code (browser)
 * - Without NEXT_PUBLIC_: Server-side only (secure, not exposed to browser)
 * 
 * Database:
 * - DATABASE_URL: PostgreSQL connection string (Hetzner VPS)
 *   Format: postgresql://user:password@host:port/database
 * 
 * Email Services:
 * - Brevo: Primary email service (supports all email providers)
 * - Resend: Fallback email service (Gmail only without custom domain)
 * 
 * External Services:
 * - ImageKit: Image hosting and optimization
 * - Upstash: Redis caching and QStash for background jobs
 */

const config = {
  env: {
    // API endpoints (public, accessible from browser)
    apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT!,
    prodApiEndpoint: process.env.NEXT_PUBLIC_PROD_API_ENDPOINT!,
    
    // ImageKit configuration (image hosting service)
    imagekit: {
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!, // Server-side only (secure)
    },
    
    // Database connection string (Hetzner VPS PostgreSQL)
    // Server-side only (never exposed to browser)
    databaseUrl: process.env.DATABASE_URL || "",
    
    // Upstash configuration (Redis + QStash)
    upstash: {
      redisUrl: process.env.UPSTASH_REDIS_URL!, // Redis connection URL
      redisToken: process.env.UPSTASH_REDIS_TOKEN!, // Redis authentication token
      qstashUrl: process.env.QSTASH_URL!, // QStash endpoint for background jobs
      qstashToken: process.env.QSTASH_TOKEN!, // QStash authentication token
    },
    
    // Email Service Configuration
    // Brevo: Primary email service (supports all email providers)
    brevo: {
      apiKey: process.env.BREVO_API_KEY!,
      senderEmail: process.env.BREVO_SENDER_EMAIL!,
      senderName: process.env.BREVO_SENDER_NAME || "BookWise Library",
    },
    // Resend: Fallback email service (Gmail only without custom domain)
    resendToken: process.env.RESEND_TOKEN!,
  },
};

export default config;
