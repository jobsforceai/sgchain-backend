// src/user/services/redeem.service.ts
import { User } from 'user/models/User.model';
import * as sagenexClient from 'core/clients/sagenexClient';
import * as walletService from 'user/services/wallet.service';
import logger from 'core/utils/logger';

export const redeemSagenexTransfer = async (sgcUserId: string, transferCode: string) => {
  logger.info(`[redeem] User ${sgcUserId} initiated redemption with code: ${transferCode}`);

  // Step 1: Call Sagenex to execute the transfer
  const response = await sagenexClient.executeTransfer({ transferCode });
  logger.info('[redeem] Received response from Sagenex API:', response);

  if (response.status !== 'SUCCESS' || !response.transferredAmountUsd || !response.sagenexUserId) {
    logger.error('[redeem] Sagenex API returned a failure status or incomplete data.');
    throw new Error(response.error || 'SAGENEX_TRANSFER_FAILED');
  }

  const { transferredAmountUsd, sagenexUserId } = response;
  logger.info(`[redeem] Sagenex confirmed transfer of ${transferredAmountUsd} USD for Sagenex User ${sagenexUserId}`);

  // Step 2: Find the corresponding SGChain user
  const user = await User.findById(sgcUserId);
  if (!user) {
    logger.error(`[redeem] SGC User with ID ${sgcUserId} not found in database.`);
    throw new Error('SGC_USER_NOT_FOUND');
  }

  // Step 3: Credit the user's USD wallet and create a ledger entry
  try {
    logger.info(`[redeem] Applying ${transferredAmountUsd} USD credit to user ${sgcUserId}'s wallet.`);
    await walletService.applyLedgerEntry({
      userId: sgcUserId,
      currency: 'USD',
      amount: transferredAmountUsd,
      type: 'DEPOSIT_FROM_SAGENEX_USD',
      meta: {
        sagenexUserId,
        transferredAmountUsd,
      },
    });
    logger.info(`[redeem] Successfully applied ledger entry for user ${sgcUserId}.`);
  } catch (error) {
    logger.error(`[redeem] CRITICAL: Failed to apply ledger entry for user ${sgcUserId} after successful Sagenex call.`, { error });
    throw error; // Re-throw the critical error
  }


  const wallet = await walletService.getWalletByUserId(sgcUserId);
  logger.info(`[redeem] Final wallet balance for user ${sgcUserId}: USD ${wallet?.fiatBalanceUsd}, SGC ${wallet?.sgcBalance}`);

  return {
    status: 'SUCCESS',
    creditedUsdAmount: transferredAmountUsd,
    usdBalanceAfter: wallet?.fiatBalanceUsd,
  };
};
