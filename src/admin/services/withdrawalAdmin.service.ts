// src/admin/services/withdrawalAdmin.service.ts
import { WithdrawalRequest } from 'user/models/WithdrawalRequest.model';
import * as walletService from 'user/services/wallet.service';
import logger from 'core/utils/logger';

export const approveWithdrawal = async (requestId: string, adminNotes: string) => {
  const request = await WithdrawalRequest.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('INVALID_WITHDRAWAL_REQUEST');
  }

  // For now, approval is a manual process. The money is already debited.
  // In the future, this step would trigger the actual bank/crypto transfer.
  request.status = 'APPROVED';
  request.adminNotes = adminNotes;
  await request.save();

  logger.info(`Withdrawal request ${requestId} has been APPROVED.`);
  return { status: 'SUCCESS', requestId };
};

export const rejectWithdrawal = async (requestId: string, adminNotes: string) => {
  const request = await WithdrawalRequest.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('INVALID_WITHDRAWAL_REQUEST');
  }

  // CRITICAL: Refund the user's USD balance.
  await walletService.applyLedgerEntry({
    userId: request.userId.toString(),
    currency: 'USD',
    amount: request.amountUsd, // Positive amount to credit back
    type: 'WITHDRAWAL_REJECTED_CREDIT',
    meta: {
      withdrawalRequestId: request._id,
      rejectionReason: adminNotes,
    },
  });

  request.status = 'REJECTED';
  request.adminNotes = adminNotes;
  await request.save();

  logger.info(`Withdrawal request ${requestId} has been REJECTED. User refunded.`);
  return { status: 'SUCCESS', requestId };
};

export const getWithdrawalRequests = async (status?: string) => {
    const query: { status?: string } = {};
    if (status) {
        query.status = status;
    }
    return WithdrawalRequest.find(query).sort({ createdAt: -1 });
};
