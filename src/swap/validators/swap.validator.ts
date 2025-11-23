import { z } from 'zod';
import { ethers } from 'ethers';

export const executeSwapValidator = z.object({
  tokenIn: z.string().refine((val) => val === 'SGC' || ethers.isAddress(val), 'Invalid tokenIn address'),
  tokenOut: z.string().refine((val) => val === 'SGC' || ethers.isAddress(val), 'Invalid tokenOut address'),
  amountIn: z.string().refine((val) => {
    try {
      return parseFloat(val) > 0;
    } catch {
      return false;
    }
  }, 'Invalid amountIn'),
  slippage: z.number().min(0.1).max(50).default(0.5), // Percentage (0.5%)
});
