import { TokenLaunch, ITokenAllocation, IVestingSchedule, ITokenLaunch } from 'token/models/TokenLaunch.model';
import * as sgchainClient from 'core/clients/sgchainClient';
import * as walletService from 'user/services/wallet.service';
import { User } from 'user/models/User.model';
import { randomUUID } from 'crypto';
import { ethers } from 'ethers';
import logger from 'core/utils/logger';
import { isValidObjectId } from 'mongoose';

// --- Mappings for Blockchain ---
const TIER_MAP = { 'FUN': 0, 'SUPER': 1 };
const VESTING_TYPE_MAP = { 'IMMEDIATE': 0, 'CLIFF': 1, 'LINEAR': 2, 'CUSTOM': 3 };
const FREQUENCY_MAP = { 'DAILY': 1, 'WEEKLY': 2, 'MONTHLY': 3 };
const CATEGORY_MAP: Record<string, number> = {
  'CREATOR': 0, 'TEAM': 1, 'TREASURY': 2, 'COMMUNITY': 3, 'LIQUIDITY': 4,
  'ADVISORS': 5, 'MARKETING': 6, 'AIRDROP': 7, 'RESERVE': 8, 'OTHER': 9
};

const DEPLOYMENT_FEES = {
  FUN: 1,
  SUPER: 100
};

const PLATFORM_FEE_SUPER = 10; // 10 SGC for the platform from SUPER tier launch

// --- Helper Functions ---
const generateId = () => randomUUID();
const toBytes32 = (uuid: string) => ethers.keccak256(ethers.toUtf8Bytes(uuid)); // Deterministic hash of UUID
const toBasisPoints = (percent: number) => Math.round(percent * 100);
const toTimestamp = (date: Date) => Math.floor(date.getTime() / 1000);

const calculateAmounts = (totalSupply: string, percent: number) => {
  const total = BigInt(totalSupply);
  // percent is 0-100. amount = total * percent / 100
  // using basis points for precision: total * (percent * 100) / 10000
  const bp = BigInt(Math.round(percent * 100));
  const amount = (total * bp) / BigInt(10000);
  return amount.toString();
};

// --- Service Methods ---

export const createDraft = async (userId: string, data: any) => {
  const user = await User.findById(userId);
  if (!user || !user.onchainAddress) throw new Error('User or wallet not found');

  // 1. Prepare Allocations with IDs and Amounts
  const allocations = data.allocations.map((a: any) => ({
    ...a,
    id: generateId(),
    amount: calculateAmounts(data.supplyConfig.totalSupply, a.percent),
  }));

  // 2. Prepare Vesting Schedules
  const vestingSchedules = (data.vestingSchedules || []).map((v: any) => {
    // Find linked allocation to get totalAmount
    // Assuming frontend sends 'allocationCategory' to link, or we link by index?
    // The validator uses `allocationCategory`. We need to find the allocation ID.
    const linkedAlloc = allocations.find((a: any) => a.category === v.allocationCategory);
    if (!linkedAlloc) throw new Error(`Vesting schedule references missing category: ${v.allocationCategory}`);

    return {
      ...v,
      id: generateId(),
      allocationId: linkedAlloc.id,
      totalAmount: linkedAlloc.amount, // Vesting usually governs the whole allocation
    };
  });

  const draft = await TokenLaunch.create({
    ...data,
    creatorUserId: userId,
    creatorWalletAddress: user.onchainAddress,
    status: 'DRAFT',
    allocations,
    vestingSchedules,
  });

  return draft;
};

export const updateDraft = async (userId: string, launchId: string, data: any) => {
  if (!isValidObjectId(launchId)) throw new Error('Invalid launch ID');
  const draft = await TokenLaunch.findOne({ _id: launchId, creatorUserId: userId });
  if (!draft) throw new Error('Draft not found');
  if (draft.status !== 'DRAFT') throw new Error('Cannot update non-draft token');

  // Recalculate logic similar to create...
  // For simplicity in this v1, we require the full object for complex updates
  // or we merge strictly. Let's assume data contains the full structure if provided.
  
  if (data.supplyConfig && data.allocations) {
     const allocations = data.allocations.map((a: any) => ({
      ...a,
      id: generateId(), // Regenerate IDs on full update to avoid staleness
      amount: calculateAmounts(data.supplyConfig.totalSupply, a.percent),
    }));
    
    // If vesting is provided, link it again
    let vestingSchedules = draft.vestingSchedules;
    if (data.vestingSchedules) {
        vestingSchedules = data.vestingSchedules.map((v: any) => {
            const linkedAlloc = allocations.find((a: any) => a.category === v.allocationCategory);
            if (!linkedAlloc) throw new Error(`Vesting schedule references missing category: ${v.allocationCategory}`);
            return {
                ...v,
                id: generateId(),
                allocationId: linkedAlloc.id,
                totalAmount: linkedAlloc.amount,
            };
        });
    }

    Object.assign(draft, { ...data, allocations, vestingSchedules });
  } else {
      // Partial update not touching supply/allocations
      Object.assign(draft, data);
  }

  await draft.save();
  return draft;
};

export const getDetails = async (launchId: string) => {
    if (!isValidObjectId(launchId)) return null;
    return TokenLaunch.findById(launchId);
};

export const getUserTokens = async (userId: string) => {
    return TokenLaunch.find({ creatorUserId: userId }).sort({ createdAt: -1 });
};

export const deployToken = async (userId: string, launchId: string) => {
  if (!isValidObjectId(launchId)) throw new Error('Invalid launch ID');
  const token = await TokenLaunch.findOne({ _id: launchId, creatorUserId: userId });
  if (!token) throw new Error('Token project not found');
  if (token.status !== 'DRAFT') throw new Error(`Invalid status for deployment: ${token.status}`);

    // Calculate Fee

    const totalFeeAmount = DEPLOYMENT_FEES[token.tier];

    if (!totalFeeAmount) throw new Error('Invalid token tier for fee calculation');

  

    let platformFee = totalFeeAmount;

    let sgcForLiquidityWei: string | undefined;

  

    if (token.tier === 'SUPER') {

      platformFee = PLATFORM_FEE_SUPER;

      const liquidityAmountSgc = totalFeeAmount - PLATFORM_FEE_SUPER;

      if (liquidityAmountSgc < 0) {

        throw new Error('SUPER tier liquidity amount cannot be negative. Adjust fees.');

      }

      sgcForLiquidityWei = ethers.parseEther(liquidityAmountSgc.toString()).toString();

    }

  

    // Check Balance

    const wallet = await walletService.getWalletByUserId(userId);

    if (!wallet || wallet.sgcBalance < totalFeeAmount) {

      throw new Error(`Insufficient SGC balance. Required: ${totalFeeAmount} SGC`);

    }

  

    // Debit Fee (Optimistic) - Debit total amount

    await walletService.applyLedgerEntry({

      userId,

      currency: 'SGC',

      amount: -totalFeeAmount,

      type: 'TOKEN_DEPLOYMENT_FEE',

      meta: { launchId, tier: token.tier, platformFee, sgcForLiquidity: sgcForLiquidityWei }

    });

  

    // 1. Lock record and store liquidity amount

    token.status = 'PENDING_ONCHAIN';

    token.sgcForLiquidity = sgcForLiquidityWei; // Store the wei amount for liquidity

    await token.save();

  

    try {

            // 2. Prepare Blockchain Params (Mapping)

            const decimals = token.metadata.decimals;

            const totalSupplyWei = ethers.parseUnits(token.supplyConfig.totalSupply, decimals);

      

            // --- DUST COLLECTION LOGIC START ---

            // We must ensure that the sum of basis points is exactly 10,000 and amounts match totalSupply

            

            let allocations = token.allocations.map(a => {

              let beneficiaryAddress = a.targetWalletAddress || token.creatorWalletAddress;

              if (token.tier === 'SUPER' && a.category === 'LIQUIDITY') {

                beneficiaryAddress = token.creatorWalletAddress;

              }

              return {

                id: toBytes32(a.id),

                category: CATEGORY_MAP[a.category] ?? 9,

                percent: toBasisPoints(a.percent),

                originalPercent: a.percent,

                amount: ethers.parseUnits(a.amount, decimals), // BigInt

                beneficiary: beneficiaryAddress,

              };

            });

      

            // Fix Basis Points Sum to 10000

            const totalBp = allocations.reduce((sum, a) => sum + a.percent, 0);

            const bpDiff = 10000 - totalBp;

            

            if (bpDiff !== 0) {

              // Add dust to the largest allocation to minimize impact

              const largestAllocIndex = allocations.reduce((maxIdx, curr, idx, arr) => 

                curr.percent > arr[maxIdx].percent ? idx : maxIdx, 0);

              

              allocations[largestAllocIndex].percent += bpDiff;

              logger.info(`Adjusted allocation ${largestAllocIndex} by ${bpDiff} basis points to fix sum.`);

            }

      

            // Fix Token Amounts Sum to Total Supply

            const totalAmountAllocated = allocations.reduce((sum, a) => sum + a.amount, BigInt(0));

            const amountDiff = totalSupplyWei - totalAmountAllocated;

      

            if (amountDiff !== BigInt(0)) {

               const largestAllocIndex = allocations.reduce((maxIdx, curr, idx, arr) => 

                curr.amount > arr[maxIdx].amount ? idx : maxIdx, 0);

               

               allocations[largestAllocIndex].amount += amountDiff;

               logger.info(`Adjusted allocation ${largestAllocIndex} amount by ${amountDiff.toString()} wei to fix total supply.`);

            }

            // --- DUST COLLECTION LOGIC END ---

      

            const baseParams: sgchainClient.CreateTokenOnChainParams = {

              backendLaunchId: toBytes32((token as any)._id.toString()),

              tier: TIER_MAP[token.tier],

              creatorWalletAddress: token.creatorWalletAddress,

              metadata: {

                name: token.metadata.name,

                symbol: token.metadata.symbol,

                decimals: decimals,

              },

              supplyConfig: {

                totalSupply: totalSupplyWei.toString(),

                isFixedSupply: token.supplyConfig.isFixedSupply,

              },

              allocations: allocations.map(a => ({

                  id: a.id,

                  category: a.category,

                  percent: a.percent,

                  amount: a.amount.toString(),

                  beneficiary: a.beneficiary

              })),

              vestingSchedules: token.vestingSchedules.map(v => {

                // Calculate timestamps

                const tgeTime = toTimestamp(new Date(v.tgeTime));

                const cliffTime = v.cliffMonths

                    ? tgeTime + (v.cliffMonths * 30 * 24 * 3600)

                    : tgeTime;

                const endTime = v.endTime

                    ? toTimestamp(new Date(v.endTime))

                    : tgeTime + (12 * 30 * 24 * 3600); // Default to 1 year if not present

      

                return {

                  id: toBytes32(v.id),

                  allocationId: toBytes32(v.allocationId!),

                  vestingType: VESTING_TYPE_MAP[v.vestingType],

                  totalAmount: ethers.parseUnits(v.totalAmount, decimals).toString(), // Convert to Wei

                  tgeTime: tgeTime,

                  tgePercent: toBasisPoints(v.tgePercent),

      

                  cliffTime: cliffTime,

                  endTime: endTime,

                  linearReleaseFrequency: v.linearReleaseFrequency ? FREQUENCY_MAP[v.linearReleaseFrequency] : 0,

      

                  customTranches: (v.customTranches || []).map(t => ({

                    unlockTime: toTimestamp(new Date(t.unlockTime)),

                    percent: toBasisPoints(t.percent)

                  }))

                };

              }),

            };

      

            logger.info(`Deploying token ${token.metadata.symbol} (Tier: ${token.tier}) to SGChain...`);

            logger.info('Blockchain Params:', JSON.stringify(baseParams, null, 2)); // Detailed logging

  

      let result: sgchainClient.CreateTokenOnChainResult;

  

      // Conditional Blockchain Client Call

      if (token.tier === 'SUPER' && sgcForLiquidityWei) {

        const liquidityParams: sgchainClient.CreateTokenWithLiquidityOnChainParams = {

          ...baseParams,

          sgcAmountForLiquidity: sgcForLiquidityWei,

        };

        result = await sgchainClient.createTokenWithLiquidity(liquidityParams);

      } else {

        result = await sgchainClient.createToken(baseParams);

      }

  

      // 4. Update Success

      token.status = 'DEPLOYED';

      token.onchainData = {

        tokenAddress: result.tokenAddress,

        txHash: result.txHash,

        deployedAt: new Date(),

        sgchainNetworkId: 'sgchain-testnet', // hardcoded for now

      };

      await token.save();

  

      return token;

  

    } catch (error: any) {

      logger.error('Token deployment failed:', error);

  

      // Refund Fee - Refund total amount

      await walletService.applyLedgerEntry({

          userId,

          currency: 'SGC',

          amount: totalFeeAmount,

          type: 'TOKEN_DEPLOYMENT_REFUND',

          meta: { launchId, reason: error.message }

      });

  

      token.status = 'FAILED';

      // Ideally store error message in DB

      await token.save();

      throw error;

    }

  };

  
