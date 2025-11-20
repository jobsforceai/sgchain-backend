// src/scripts/test-onchain-sgc.ts
import { env } from '../core/config/env';
import { getOnchainSgcBalance, sendSgcFromHotWallet } from "../core/clients/sgchainClient";
import { ethers } from 'ethers';

async function main() {
  if (!env.TEST_SGC_TARGET_ADDRESS) throw new Error("Set TEST_SGC_TARGET_ADDRESS in .env");
  if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) throw new Error("SGCHAIN_HOT_WALLET_PRIVATE_KEY is not set");

  console.log("Checking hot wallet balance...");
  const hotWalletAddress = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY).address;
  const hotBalance = await getOnchainSgcBalance(hotWalletAddress);
  console.log("Hot wallet SGC:", hotBalance);

  console.log(`Sending 1 SGC to ${env.TEST_SGC_TARGET_ADDRESS}...`);
  const { txHash } = await sendSgcFromHotWallet({ to: env.TEST_SGC_TARGET_ADDRESS, amountSgc: 1 });
  console.log("Tx hash:", txHash);

  console.log("Done. Check this tx on your SGChain explorer / RPC tools.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
