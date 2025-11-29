import { ethers } from "ethers";
import { env } from "../core/config/env";
import { TOKEN_FACTORY_ABI } from "../core/config/abis";
import { getProvider } from "../core/utils/provider";

// A "Simple" Super Token to test basic connectivity
const SIMPLE_PARAMS = {
  backendLaunchId: ethers.keccak256(ethers.toUtf8Bytes("simple-test-" + Date.now())),
  tier: 1, // SUPER
  creatorWalletAddress: "0x487aEa14d763b31D1e25C2A2f15ebb91Bfa0C666", 
  metadata: {
    name: "Simple Test",
    symbol: "SMPL",
    decimals: 18,
  },
  supplyConfig: {
    totalSupply: ethers.parseUnits("1000", 18).toString(), // Just 1000 tokens
    isFixedSupply: true,
  },
  allocations: [
    {
      id: ethers.keccak256(ethers.toUtf8Bytes("alloc-1")),
      category: 4, // LIQUIDITY
      percent: 10000, // 100%
      amount: ethers.parseUnits("1000", 18).toString(),
      beneficiary: "0x487aEa14d763b31D1e25C2A2f15ebb91Bfa0C666",
    }
  ],
  vestingSchedules: [],
  sgcAmountForLiquidity: ethers.parseEther("1").toString() // Just 1 SGC
};

const runTest = async () => {
  console.log("--- Deploying SIMPLE SUPER Token ---");
  
  const provider = getProvider();
  const wallet = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(env.TOKEN_FACTORY_CONTRACT_ADDRESS!, TOKEN_FACTORY_ABI, wallet);

  console.log("Params:", JSON.stringify(SIMPLE_PARAMS, null, 2));

  try {
    // We send a real transaction but wait for it
    const tx = await contract.createTokenWithLiquidity(
      {
        backendLaunchId: SIMPLE_PARAMS.backendLaunchId,
        tier: SIMPLE_PARAMS.tier,
        creator: SIMPLE_PARAMS.creatorWalletAddress,
        metadata: SIMPLE_PARAMS.metadata,
        supplyConfig: SIMPLE_PARAMS.supplyConfig,
        allocations: SIMPLE_PARAMS.allocations,
        vestingSchedules: SIMPLE_PARAMS.vestingSchedules
      },
      { 
        value: SIMPLE_PARAMS.sgcAmountForLiquidity,
        gasLimit: 3000000 
      }
    );

    console.log(`Transaction Sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error: any) {
    console.error("Error sending transaction:", error);
    if (error.receipt) {
        console.log("Status:", error.receipt.status);
    }
  }
};

runTest();
