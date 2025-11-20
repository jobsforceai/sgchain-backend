// src/core/clients/sgchainClient.ts
import { ethers } from "ethers";
import logger from "../utils/logger";
import { env } from "../config/env";
import { encrypt, decrypt } from "../utils/crypto";

// Ensure environment variables are set and throw if they are not
if (!env.SGCHAIN_RPC_URL || !env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) {
  throw new Error("Missing required on-chain environment variables.");
}

const provider = new ethers.JsonRpcProvider(env.SGCHAIN_RPC_URL);

// 1. Create a new custodial wallet for a user
export const createCustodialWallet = (): { address: string; encryptedPrivateKey: string; } => {
  const wallet = ethers.Wallet.createRandom();
  const encryptedPrivateKey = encrypt(wallet.privateKey);
  return {
    address: wallet.address,
    encryptedPrivateKey,
  };
};

// 2. Send SGC (native currency) from a generic private key
export const sendSgcFromPrivateKey = async (params: {
  privateKey: string;
  to: string;
  amountSgc: number;
}): Promise<{ txHash: string; }> => {
  const userWallet = new ethers.Wallet(params.privateKey, provider);
  const amountWei = ethers.parseEther(params.amountSgc.toString());

  const tx = await userWallet.sendTransaction({
    to: params.to,
    value: amountWei,
  });
  await tx.wait();
  logger.info(`Sent ${params.amountSgc} SGC from ${userWallet.address} to ${params.to}. Tx: ${tx.hash}`);
  return { txHash: tx.hash };
};

// 3. Send SGC (native currency) from hot wallet
export const sendSgcFromHotWallet = async (params: {
  to: string;
  amountSgc: number;
}) => {
  if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) throw new Error("Hot wallet key is not configured");
  const hotWallet = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY, provider);
  const amountWei = ethers.parseEther(params.amountSgc.toString());
  
  const tx = await hotWallet.sendTransaction({
    to: params.to,
    value: amountWei,
  });
  await tx.wait();
  logger.info(`Sent ${params.amountSgc} SGC from hot wallet to ${params.to}. Tx: ${tx.hash}`);
  return { txHash: tx.hash };
};

// 4. Send SGC (native currency) from a user's custodial wallet
export const sendSgcFromUserWallet = async (params: {
  encryptedPrivateKey: string;
  amountSgc: number;
}) => {
  if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) throw new Error("Hot wallet key is not configured");
  const privateKey = decrypt(params.encryptedPrivateKey);
  const userWallet = new ethers.Wallet(privateKey, provider);
  const hotWalletAddress = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY).address;
  const amountWei = ethers.parseEther(params.amountSgc.toString());

  const tx = await userWallet.sendTransaction({
    to: hotWalletAddress,
    value: amountWei,
  });
  await tx.wait();
  logger.info(`Sent ${params.amountSgc} SGC from user ${userWallet.address} to hot wallet. Tx: ${tx.hash}`);
  return { txHash: tx.hash };
};

// 5. Get onchain SGC (native currency) balance of an address
export async function getOnchainSgcBalance(address: string): Promise<string> {
  const balanceWei = await provider.getBalance(address);
  return ethers.formatEther(balanceWei);
}

// 6. Get transaction status
export async function getTxStatus(txHash: string): Promise<"PENDING" | "CONFIRMED" | "FAILED"> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return "PENDING";
  return receipt.status === 1 ? "CONFIRMED" : "FAILED";
}