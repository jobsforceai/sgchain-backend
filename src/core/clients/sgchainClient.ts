// src/core/clients/sgchainClient.ts
import { ethers } from "ethers";
import logger from "../utils/logger";
import { env } from "../config/env";
import { encrypt, decrypt } from "../utils/crypto";
import { TOKEN_FACTORY_ABI, UNISWAP_V2_ROUTER_ABI, SGC_TOKEN_ABI } from "../config/abis";
import { getProvider } from "../utils/provider";

// Ensure environment variables are set and throw if they are not
if (!env.SGCHAIN_RPC_URL || !env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) {
  throw new Error("Missing required on-chain environment variables.");
}

// Use Shared Provider
const provider = getProvider();

// Hot Wallet for signing transactions to the TokenFactory
const hotWallet = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY, provider);

// --- Contract Addresses ---
const TOKEN_FACTORY_ADDRESS = env.TOKEN_FACTORY_CONTRACT_ADDRESS || "0x2BDE6AcAd0f3FD6465659ec67f80A26a2E784784";
const UNISWAP_ROUTER_ADDRESS = env.UNISWAP_V2_ROUTER_02_ADDRESS || "0x6b1700d88f3b29e46ADF4A6810056e6C6561728e";
const SGC_TOKEN_ADDRESS = env.SGC_TOKEN_CONTRACT_ADDRESS || "0xc9C8FfC6A16a169B17cf99f239d202475FC82f32";

// --- Contract Instances ---
const tokenFactoryContract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, hotWallet);

// ... (Keep existing code) ...

// 9. Get Swap Quote (Read-only)
export const getSwapQuote = async (params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}): Promise<string> => {
  const routerContract = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, provider);
  const WETH = await routerContract.WETH();

  let path: string[] = [];
  const tokenInAddr = params.tokenIn === 'SGC' ? WETH : params.tokenIn;
  const tokenOutAddr = params.tokenOut === 'SGC' ? WETH : params.tokenOut;

  if (tokenInAddr.toLowerCase() === tokenOutAddr.toLowerCase()) return params.amountIn; // Same token

  if (tokenInAddr.toLowerCase() === WETH.toLowerCase() || tokenOutAddr.toLowerCase() === WETH.toLowerCase()) {
      path = [tokenInAddr, tokenOutAddr];
  } else {
      path = [tokenInAddr, WETH, tokenOutAddr];
  }

  // Decimals
  let decimalsIn = 18;
  const getDecimals = async (address: string) => {
    const tokenContract = new ethers.Contract(address, SGC_TOKEN_ABI, provider);
    return await tokenContract.decimals();
  };
  if (params.tokenIn !== 'SGC') decimalsIn = await getDecimals(params.tokenIn);
  
  const amountInWei = ethers.parseUnits(params.amountIn, decimalsIn);
  
  try {
    const amounts = await routerContract.getAmountsOut(amountInWei, path);
    const amountOutWei = amounts[amounts.length - 1];
    
    let decimalsOut = 18;
    if (params.tokenOut !== 'SGC') decimalsOut = await getDecimals(params.tokenOut);

    return ethers.formatUnits(amountOutWei, decimalsOut);
  } catch (error) {
    logger.error('Error getting swap quote', error);
    throw new Error('INSUFFICIENT_LIQUIDITY');
  }
};

export const executeSwap = async (params: {
  encryptedPrivateKey: string;
  tokenIn: string; // Address or 'SGC'
  tokenOut: string; // Address or 'SGC'
  amountIn: string; // Human readable string
  amountOutMin: string; // Human readable string
  slippage: number; // Percentage (e.g., 0.5)
}): Promise<{ txHash: string }> => {
  // 1. Setup Wallet
  const privateKey = decrypt(params.encryptedPrivateKey);
  const userWallet = new ethers.Wallet(privateKey, provider);
  const routerContract = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_V2_ROUTER_ABI, userWallet);

  const isNativeIn = params.tokenIn === 'SGC';
  const isNativeOut = params.tokenOut === 'SGC';

  // 2. Parse Amounts
  let decimalsIn = 18;
  let decimalsOut = 18;

  const getDecimals = async (address: string) => {
    const tokenContract = new ethers.Contract(address, SGC_TOKEN_ABI, provider); 
    return await tokenContract.decimals();
  };

  if (!isNativeIn) decimalsIn = await getDecimals(params.tokenIn);
  if (!isNativeOut) decimalsOut = await getDecimals(params.tokenOut);

  const amountInWei = ethers.parseUnits(params.amountIn, decimalsIn);
  const amountOutMinWei = ethers.parseUnits(params.amountOutMin, decimalsOut);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  logger.info(`Executing swap: ${params.amountIn} ${isNativeIn ? 'SGC' : params.tokenIn} -> ${params.tokenOut}`);

  let tx;

  // 3. Approve if Token In is ERC-20
  if (!isNativeIn) {
    const tokenInContract = new ethers.Contract(params.tokenIn, SGC_TOKEN_ABI, userWallet);
    const currentAllowance = await tokenInContract.allowance(userWallet.address, UNISWAP_ROUTER_ADDRESS);
    if (currentAllowance < amountInWei) {
      logger.info(`Approving Router to spend ${params.amountIn} of ${params.tokenIn}`);
      // NOTE: Approval still needs to wait because swap will fail otherwise
      const approveTx = await tokenInContract.approve(UNISWAP_ROUTER_ADDRESS, ethers.MaxUint256);
      await approveTx.wait(); 
      logger.info('Approval confirmed');
    }
  }

  // 4. Execute Swap Function
  let path: string[] = [];
  const WETH = await routerContract.WETH();

  if (isNativeIn) {
    path = [WETH, params.tokenOut];
    tx = await routerContract.swapExactETHForTokens(
      amountOutMinWei,
      path,
      userWallet.address,
      deadline,
      { value: amountInWei }
    );
  } else if (isNativeOut) {
    path = [params.tokenIn, WETH];
    tx = await routerContract.swapExactTokensForETH(
      amountInWei,
      amountOutMinWei,
      path,
      userWallet.address,
      deadline
    );
  } else {
    if (params.tokenIn.toLowerCase() === WETH.toLowerCase() || params.tokenOut.toLowerCase() === WETH.toLowerCase()) {
       path = [params.tokenIn, params.tokenOut];
    } else {
       path = [params.tokenIn, WETH, params.tokenOut];
    }
    
    tx = await routerContract.swapExactTokensForTokens(
      amountInWei,
      amountOutMinWei,
      path,
      userWallet.address,
      deadline
    );
  }

  // NON-BLOCKING: We do NOT wait for confirmation here anymore.
  logger.info(`Swap transaction sent: ${tx.hash}`);

  return { txHash: tx.hash };
};


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
  // NON-BLOCKING
  logger.info(`Sent SGC transaction. Hash: ${tx.hash}`);
  return { txHash: tx.hash };
};

// 3. Send SGC (native currency) from hot wallet
export const sendSgcFromHotWallet = async (params: {
  to: string;
  amountSgc: number;
}) => {
  if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) throw new Error("Hot wallet key is not configured");
  
  // Reuse the global hotWallet instance (connected to shared provider)
  const amountWei = ethers.parseEther(params.amountSgc.toString());
  
  const tx = await hotWallet.sendTransaction({
    to: params.to,
    value: amountWei,
  });
  // NON-BLOCKING
  logger.info(`Sent SGC from hot wallet. Hash: ${tx.hash}`);
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
  const hotWalletAddress = hotWallet.address; // Use the address from the global instance
  const amountWei = ethers.parseEther(params.amountSgc.toString());

  const tx = await userWallet.sendTransaction({
    to: hotWalletAddress,
    value: amountWei,
  });
  // NON-BLOCKING
  logger.info(`Sent SGC from user to hot wallet. Hash: ${tx.hash}`);
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

// 7. Token Creation
export interface CreateTokenOnChainParams {
  backendLaunchId: string;        // MUST be a 32-byte hex string
  tier: number;                   // 0 for FUN, 1 for SUPER
  creatorWalletAddress: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
  supplyConfig: {
    totalSupply: string;          // wei amount as string
    isFixedSupply: boolean;
  };
  allocations: {
    id: string;                   // MUST be a 32-byte hex string
    category: number;             // Mapped enum
    percent: number;              // MUST be in basis points (e.g., 100% = 10000)
    amount: string;               // wei amount as string
    beneficiary: string;
  }[];
  vestingSchedules: {
    id: string;                   // MUST be a 32-byte hex string
    allocationId: string;         // MUST be a 32-byte hex string
    vestingType: number;          // Mapped enum
    totalAmount: string;          // wei amount as string
    tgeTime: number;              // Unix timestamp (seconds)
    tgePercent: number;           // MUST be in basis points

    cliffTime: number;            // Unix timestamp (seconds)
    endTime: number;              // Unix timestamp (seconds)
    linearReleaseFrequency: number; // Mapped enum

    customTranches: {
      unlockTime: number;         // Unix timestamp (seconds)
      percent: number;            // MUST be in basis points
    }[];
  }[];
}

export interface CreateTokenOnChainResult {
  tokenAddress: string;
  txHash: string;
}

export const createToken = async (params: CreateTokenOnChainParams): Promise<CreateTokenOnChainResult> => {
  logger.info("Calling TokenFactory.createToken on SGChain...", {
    name: params.metadata.name,
    tier: params.tier === 0 ? 'FUN' : 'SUPER',
    supply: params.supplyConfig.totalSupply
  });

  const txResponse = await tokenFactoryContract.createToken({
    backendLaunchId: params.backendLaunchId,
    tier: params.tier,
    creator: params.creatorWalletAddress,
    metadata: params.metadata,
    supplyConfig: params.supplyConfig,
    allocations: params.allocations,
    vestingSchedules: params.vestingSchedules
  });
  
  // NOTE: For contract creation/complex logic where we NEED the address immediately,
  // we unfortunately still have to wait, OR we need to refactor the calling service to 
  // handle "Pending Deployment".
  // For now, let's keep wait() ONLY for token creation as it's rare compared to transfers.
  const receipt = await txResponse.wait();

  // Find the TokenCreated event
  const tokenCreatedEvent = receipt.logs.find((log: any) => {
    try {
      return tokenFactoryContract.interface.parseLog(log)?.name === 'TokenCreated';
    } catch (e) {
      return false;
    }
  });

  if (!tokenCreatedEvent) {
    throw new Error("TokenCreated event not found in transaction receipt.");
  }
  const parsedEvent = tokenFactoryContract.interface.parseLog(tokenCreatedEvent);
  const tokenAddress = parsedEvent?.args?.token;

  if (!tokenAddress) {
    throw new Error("Could not extract tokenAddress from TokenCreated event.");
  }

  logger.info("Token deployed successfully.", {
    tokenAddress: tokenAddress,
    txHash: receipt.hash
  });

  return {
    tokenAddress: tokenAddress,
    txHash: receipt.hash
  };
};

export interface CreateTokenWithLiquidityOnChainParams extends CreateTokenOnChainParams {
  sgcAmountForLiquidity: string; // Amount of SGC in wei for the LP
}

export const createTokenWithLiquidity = async (params: CreateTokenWithLiquidityOnChainParams): Promise<CreateTokenOnChainResult> => {
  logger.info("Calling TokenFactory.createTokenWithLiquidity on SGChain...", {
    name: params.metadata.name,
    tier: params.tier === 0 ? 'FUN' : 'SUPER',
    supply: params.supplyConfig.totalSupply,
    sgcForLiquidity: params.sgcAmountForLiquidity
  });

  // Call createTokenWithLiquidity on TokenFactory, passing value as overrides
  const txResponse = await tokenFactoryContract.createTokenWithLiquidity(
    {
      backendLaunchId: params.backendLaunchId,
      tier: params.tier,
      creator: params.creatorWalletAddress,
      metadata: params.metadata,
      supplyConfig: params.supplyConfig,
      allocations: params.allocations,
      vestingSchedules: params.vestingSchedules
    },
    { value: params.sgcAmountForLiquidity } // Send native SGC as value
  );
  
  const receipt = await txResponse.wait();
  
  // Find the TokenCreated event
  const tokenCreatedEvent = receipt.logs.find((log: any) => {
    try {
      return tokenFactoryContract.interface.parseLog(log)?.name === 'TokenCreated';
    } catch (e) {
      return false;
    }
  });

  if (!tokenCreatedEvent) {
    throw new Error("TokenCreated event not found in transaction receipt.");
  }
  const parsedEvent = tokenFactoryContract.interface.parseLog(tokenCreatedEvent);
  const tokenAddress = parsedEvent?.args?.token;

  if (!tokenAddress) {
    throw new Error("Could not extract tokenAddress from TokenCreated event.");
  }

  logger.info("Token with liquidity deployed successfully.", {
    tokenAddress: tokenAddress,
    txHash: receipt.hash
  });

  return {
    tokenAddress: tokenAddress,
    txHash: receipt.hash
  };
};
