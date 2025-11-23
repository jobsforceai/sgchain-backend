import { z } from 'zod';
import { ethers } from 'ethers';

const allocationCategoryEnum = z.enum([
  'CREATOR',
  'TEAM',
  'TREASURY',
  'COMMUNITY',
  'LIQUIDITY',
  'ADVISORS',
  'MARKETING',
  'AIRDROP',
  'RESERVE',
  'OTHER',
]);

const vestingTypeEnum = z.enum(['IMMEDIATE', 'CLIFF', 'LINEAR', 'CUSTOM']);
const linearFrequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional();

// Allocation Schema
const tokenAllocationSchema = z.object({
  category: allocationCategoryEnum,
  label: z.string().optional(),
  percent: z.number().min(0).max(100),
  targetWalletAddress: z.string().optional().refine((val) => !val || ethers.isAddress(val), {
    message: 'Invalid target wallet address',
  }),
});

// Vesting Schema
const vestingScheduleSchema = z.object({
  allocationCategory: allocationCategoryEnum, // Used to link to allocation in frontend usually, but we use ID internally. 
  // For ingress, we might match by category or index. 
  // Let's assume the user sends the full object structure matching the interface.
  vestingType: vestingTypeEnum,
  tgePercent: z.number().min(0).max(100),
  tgeTime: z.string().datetime(), // ISO Date string
  cliffMonths: z.number().min(0).optional(),
  linearReleaseFrequency: linearFrequencyEnum,
  customTranches: z.array(z.object({
    unlockTime: z.string().datetime(),
    percent: z.number().min(0).max(100),
  })).optional(),
});

export const createTokenDraftValidator = z.object({
  tier: z.enum(['FUN', 'SUPER']),
  metadata: z.object({
    name: z.string().min(1).max(50),
    symbol: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Symbol must be uppercase alphanumeric'),
    decimals: z.number().int().min(0).max(18).default(18),
    logoUrl: z.string().url().optional(),
    description: z.string().max(1000).optional(),
    website: z.string().url().optional(),
    twitter: z.string().optional(),
    telegram: z.string().optional(),
    discord: z.string().optional(),
    otherLinks: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
    })).optional(),
  }),
  supplyConfig: z.object({
    totalSupply: z.string().refine((val) => {
      try {
        return BigInt(val) > BigInt(0);
      } catch {
        return false;
      }
    }, 'Total supply must be a valid positive BigInt string'),
    maxSupply: z.string().optional(),
    isFixedSupply: z.boolean().default(true),
  }),
  allocations: z.array(tokenAllocationSchema).refine((allocations) => {
    const sum = allocations.reduce((acc, curr) => acc + curr.percent, 0);
    return Math.abs(sum - 100) < 0.001; // Allow small float errors
  }, 'Allocation percentages must sum to 100%'),
  vestingSchedules: z.array(vestingScheduleSchema).optional(),
}).superRefine((data, ctx) => {
  // Supply Validation per Tier
  try {
    const supply = BigInt(data.supplyConfig.totalSupply);
    const minSupply = BigInt(1000);
    
    if (supply < minSupply) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total supply must be at least 1,000',
        path: ['supplyConfig', 'totalSupply'],
      });
    }

    if (data.tier === 'FUN') {
      const maxFun = BigInt(1000000); // 1 Million
      if (supply > maxFun) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'FUN tier total supply cannot exceed 1,000,000',
          path: ['supplyConfig', 'totalSupply'],
        });
      }
    } else if (data.tier === 'SUPER') {
      const maxSuper = BigInt(1000000000000); // 1 Trillion
      if (supply > maxSuper) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SUPER tier total supply cannot exceed 1,000,000,000,000',
          path: ['supplyConfig', 'totalSupply'],
        });
      }

      const liquidityAllocations = data.allocations.filter(a => a.category === 'LIQUIDITY');
      if (liquidityAllocations.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SUPER tier tokens must have exactly one LIQUIDITY allocation',
          path: ['allocations'],
        });
      } else if (liquidityAllocations[0].percent < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SUPER tier LIQUIDITY allocation must be at least 5%',
          path: ['allocations'],
        });
      }
    }
  } catch {
    // BigInt parsing error handled by base schema
  }
});

export const updateTokenDraftValidator = createTokenDraftValidator.partial();
