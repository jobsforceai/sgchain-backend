import { Schema, model, Document } from 'mongoose';

export interface ITokenAllocation {
  id: string; // UUID
  category: 'CREATOR' | 'TEAM' | 'TREASURY' | 'COMMUNITY' | 'LIQUIDITY' | 'ADVISORS' | 'MARKETING' | 'AIRDROP' | 'RESERVE' | 'OTHER';
  label?: string;
  percent: number; // 0-100
  amount: string; // BigInt string
  targetWalletAddress?: string;
}

export interface IVestingSchedule {
  id: string; // UUID
  allocationId?: string;
  beneficiaryWallet?: string;
  vestingType: 'IMMEDIATE' | 'CLIFF' | 'LINEAR' | 'CUSTOM';
  totalAmount: string;
  tgePercent: number; // 0-100
  tgeTime: Date;
  cliffMonths?: number;
  endTime?: Date;
  linearReleaseFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  customTranches?: {
    unlockTime: Date;
    percent: number;
  }[];
}

export interface ITokenLaunch extends Document {
  tier: 'FUN' | 'SUPER';
  creatorUserId: Schema.Types.ObjectId;
  creatorWalletAddress: string;
  status: 'DRAFT' | 'PENDING_ONCHAIN' | 'DEPLOYED' | 'FAILED' | 'REJECTED';
  
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
    logoUrl?: string;
    description?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    otherLinks?: { label: string; url: string }[];
  };

  supplyConfig: {
    totalSupply: string;
    maxSupply?: string;
    isFixedSupply: boolean;
  };

  allocations: ITokenAllocation[];
  vestingSchedules: IVestingSchedule[];

  features: {
    allowAdvancedVesting: boolean;
    allowAdditionalMint?: boolean;
    isTradableByDefault: boolean;
  };

  admin?: {
    reviewedByAdminId?: Schema.Types.ObjectId;
    reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNotes?: string;
  };

  onchainData?: {
    tokenAddress?: string;
    txHash?: string;
    sgchainNetworkId?: string;
    deployedAt?: Date;
  };

  sgcForLiquidity?: string;

  isPublic: boolean;
  isListedOnExplorer: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const tokenLaunchSchema = new Schema<ITokenLaunch>(
  {
    tier: { type: String, enum: ['FUN', 'SUPER'], required: true },
    creatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    creatorWalletAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_ONCHAIN', 'DEPLOYED', 'FAILED', 'REJECTED'],
      default: 'DRAFT',
    },

    metadata: {
      name: { type: String, required: true },
      symbol: { type: String, required: true },
      decimals: { type: Number, default: 18 },
      logoUrl: { type: String },
      description: { type: String },
      website: { type: String },
      twitter: { type: String },
      telegram: { type: String },
      discord: { type: String },
      otherLinks: [{ label: String, url: String }],
    },

    supplyConfig: {
      totalSupply: { type: String, required: true },
      maxSupply: { type: String },
      isFixedSupply: { type: Boolean, default: true },
    },

    allocations: [
      {
        id: { type: String, required: true },
        category: {
          type: String,
          enum: [
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
          ],
          required: true,
        },
        label: { type: String },
        percent: { type: Number, required: true },
        amount: { type: String, required: true },
        targetWalletAddress: { type: String },
      },
    ],

    vestingSchedules: [
      {
        id: { type: String, required: true },
        allocationId: { type: String },
        beneficiaryWallet: { type: String },
        vestingType: {
          type: String,
          enum: ['IMMEDIATE', 'CLIFF', 'LINEAR', 'CUSTOM'],
          required: true,
        },
        totalAmount: { type: String, required: true },
        tgePercent: { type: Number, required: true },
        tgeTime: { type: Date, required: true },
        cliffMonths: { type: Number },
        endTime: { type: Date },
        linearReleaseFrequency: {
          type: String,
          enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
        },
        customTranches: [
          {
            unlockTime: { type: Date, required: true },
            percent: { type: Number, required: true },
          },
        ],
      },
    ],

    features: {
      allowAdvancedVesting: { type: Boolean, default: false },
      allowAdditionalMint: { type: Boolean, default: false },
      isTradableByDefault: { type: Boolean, default: true },
    },

    admin: {
      reviewedByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
      reviewStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
      },
      reviewNotes: { type: String },
    },

    onchainData: {
      tokenAddress: { type: String },
      txHash: { type: String },
      sgchainNetworkId: { type: String },
      deployedAt: { type: Date },
    },

    isPublic: { type: Boolean, default: false },
    isListedOnExplorer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const TokenLaunch = model<ITokenLaunch>('TokenLaunch', tokenLaunchSchema);
