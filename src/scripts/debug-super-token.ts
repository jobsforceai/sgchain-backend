import { ethers } from "ethers";
import { env } from "../core/config/env";
import { TOKEN_FACTORY_ABI } from "../core/config/abis";
import { getProvider } from "../core/utils/provider";

// MOCK DATA matching your failure case
const MOCK_PARAMS = {
  backendLaunchId: ethers.keccak256(ethers.toUtf8Bytes("debug-launch-id")),
  tier: 1, // SUPER
  creatorWalletAddress: "0x487aEa14d763b31D1e25C2A2f15ebb91Bfa0C666", // Using hot wallet as creator for test
  metadata: {
    name: "Debug Coin",
    symbol: "DBG",
    decimals: 18,
  },
  supplyConfig: {
    totalSupply: ethers.parseUnits("1000000000", 18).toString(), // 1 Billion
    isFixedSupply: true,
  },
  allocations: [
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("alloc-1")),
      category: 4, // LIQUIDITY
      percent: 10000, // 100% for simplicity in debug
      amount: ethers.parseUnits("1000000000", 18).toString(),
      beneficiary: "0x487aEa14d763b31D1e25C2A2f15ebb91Bfa0C666", // Valid address (Hot Wallet)
    }
  ],
  vestingSchedules: [], // Empty for simplicity
  sgcAmountForLiquidity: ethers.parseEther("90").toString() // 90 SGC
};

const runDebug = async () => {
  console.log("--- Starting Debug Script for SUPER Token Deployment ---");
  
  if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) throw new Error("Missing Hot Wallet Key");
  
  const provider = getProvider();
  const wallet = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY, provider);
  const factoryAddress = env.TOKEN_FACTORY_CONTRACT_ADDRESS || "0x2BDE6AcAd0f3FD6465659ec67f80A26a2E784784";
  
  console.log(`Factory Address: ${factoryAddress}`);
  console.log(`Wallet Address: ${wallet.address}`);
  
  const contract = new ethers.Contract(factoryAddress, TOKEN_FACTORY_ABI, wallet);

  // 1. Log Raw Params
  console.log("\n1. Parameters being sent:");
  console.log(JSON.stringify(MOCK_PARAMS, null, 2));

  // 2. Encode Function Data
  // Note: We reconstruct the args structure expected by the ABI
  const args = [
    {
      backendLaunchId: MOCK_PARAMS.backendLaunchId,
      tier: MOCK_PARAMS.tier,
      creator: MOCK_PARAMS.creatorWalletAddress,
      metadata: MOCK_PARAMS.metadata,
      supplyConfig: MOCK_PARAMS.supplyConfig,
      allocations: MOCK_PARAMS.allocations,
      vestingSchedules: MOCK_PARAMS.vestingSchedules
    }
  ];

  try {
    console.log("\n2. Attempting static call (simulation)...");
    
    // We attempt to CALL the function. If it reverts, ethers will try to give us the reason.
    // We pass value because it's payable.
    await contract.createTokenWithLiquidity.staticCall(args[0], { value: MOCK_PARAMS.sgcAmountForLiquidity });
    
    console.log("✅ SUCCESS: Static call succeeded! The transaction *should* work.");
  } catch (error: any) {
    console.log("\n❌ FAILURE: Static call reverted.");
    
    if (error.data) {
      console.log(`Revert Data (Hex): ${error.data}`);
      try {
        const decoded = contract.interface.parseError(error.data);
        console.log(`Decoded Revert Reason: ${decoded?.name} (${decoded?.args})`);
      } catch (e) {
        console.log("Could not decode error data with ABI. Is it a standard Error(string)?");
        try {
            const reason = ethers.toUtf8String('0x' + error.data.substring(138));
            console.log("Raw String Decode Attempt:", reason);
        } catch {}
      }
    } else if (error.reason) {
      console.log(`Revert Reason String: "${error.reason}"`);
    } else {
      console.log("No specific revert data found. Full error object:", error);
    }
  }
};

runDebug();
