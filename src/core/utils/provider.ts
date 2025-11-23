import { ethers } from "ethers";
import { env } from "../config/env";
import logger from "../utils/logger";

let provider: ethers.JsonRpcProvider | null = null;

export const getProvider = (): ethers.JsonRpcProvider => {
  if (provider) return provider;

  if (!env.SGCHAIN_RPC_URL) {
    throw new Error("Missing SGCHAIN_RPC_URL in environment variables.");
  }

  // Initialize with static network if possible to avoid auto-detect overhead
  // For a custom chain, usually we just pass the URL.
  provider = new ethers.JsonRpcProvider(env.SGCHAIN_RPC_URL, undefined, {
    staticNetwork: true // Optimisation: Assume network doesn't change
  });
  
  logger.info(`Initialized shared JsonRpcProvider for ${env.SGCHAIN_RPC_URL}`);
  return provider;
};
