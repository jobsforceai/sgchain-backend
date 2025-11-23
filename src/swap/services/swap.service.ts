import { User } from 'user/models/User.model';
import * as sgchainClient from 'core/clients/sgchainClient';

export const executeSwap = async (userId: string, data: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippage: number;
}) => {
  const user = await User.findById(userId).select('+encryptedPrivateKey');
  if (!user || !user.encryptedPrivateKey) throw new Error('User wallet not found');

  // 1. Get Expected Output
  const expectedAmountOut = await sgchainClient.getSwapQuote({
    tokenIn: data.tokenIn,
    tokenOut: data.tokenOut,
    amountIn: data.amountIn,
  });

  // 2. Calculate Minimum Output with Slippage
  // amountOutMin = expected * (1 - slippage/100)
  const slippageFactor = 1 - (data.slippage / 100);
  const amountOutMin = (parseFloat(expectedAmountOut) * slippageFactor).toFixed(18); // Keep precision high

  // 3. Execute
  const result = await sgchainClient.executeSwap({
    encryptedPrivateKey: user.encryptedPrivateKey,
    tokenIn: data.tokenIn,
    tokenOut: data.tokenOut,
    amountIn: data.amountIn,
    amountOutMin: amountOutMin,
    slippage: data.slippage,
  });

  return {
    status: 'SUCCESS',
    txHash: result.txHash,
    amountIn: data.amountIn,
    tokenIn: data.tokenIn,
    tokenOut: data.tokenOut,
    expectedAmountOut,
    minAmountOut: amountOutMin
  };
};

export const getQuote = async (data: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}) => {
  const quote = await sgchainClient.getSwapQuote(data);
  return { amountOut: quote };
};
