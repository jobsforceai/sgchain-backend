import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Set the NODE_ENV to 'development' if it's not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  PORT: z.string().default('3000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET_ADMIN: z.string().min(1, 'JWT_SECRET_ADMIN is required'),
  JWT_SECRET_USER: z.string().min(1, 'JWT_SECRET_USER is required'),
  SGCHAIN_RPC_URL: z.string().optional(),
  SGCHAIN_WS_URL: z.string().optional(),
  SGCHAIN_HOT_WALLET_PRIVATE_KEY: z.string().optional(),
  TEST_SGC_TARGET_ADDRESS: z.string().optional(),
  SGC_WALLET_ENCRYPTION_KEY: z.string().length(64, 'Must be a 32-byte hex key'),
  SGC_TOKEN_CONTRACT_ADDRESS: z.string().optional(),
  UNISWAP_V2_ROUTER_02_ADDRESS: z.string().optional(),
  WETH_CONTRACT_ADDRESS: z.string().optional(),
  TOKEN_FACTORY_CONTRACT_ADDRESS: z.string().optional(),
  // Sagenex to SGChain Transfers
  SGC_TRANSFER_JWT_SECRET: z.string().min(1),
  SAGENEX_INTERNAL_SECRET: z.string().min(1),
  SGTRADING_INTERNAL_SECRET: z.string().min(1).default('default_secret_for_dev'),
  SGTRADING_API_URL: z.string().default('http://localhost:8080/api/v1'),
  SGTRADING_WS_URL: z.string().default('http://localhost:8080'),
  // Email Service (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('no-reply@example.com'),
});
export const env = envSchema.parse(process.env);
