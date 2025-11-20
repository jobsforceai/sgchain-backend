import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import { LedgerEntry } from 'user/models/LedgerEntry.model';
import * as walletService from 'user/services/wallet.service';
import { AdminAuditLog } from 'admin/models/AdminAuditLog.model';

export const getUserWalletWithLedger = async (userId: string) => {
  const user = await User.findById(userId);
  const wallet = await Wallet.findOne({ userId });
  const ledger = await LedgerEntry.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return { user, wallet, ledger };
};

export const manualAdjust = async (
  userId: string,
  data: {
    currency: 'SGC' | 'USD';
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    reason: string;
    adminId: string;
  }
) => {
  const amount = data.direction === 'CREDIT' ? data.amount : -data.amount;
  const type =
    data.direction === 'CREDIT'
      ? 'ADMIN_ADJUST_CREDIT'
      : 'ADMIN_ADJUST_DEBIT';

  await walletService.applyLedgerEntry({
    userId,
    currency: data.currency,
    amount,
    type,
    meta: { reason: data.reason, adminId: data.adminId },
  });

  await AdminAuditLog.create({
    adminId: data.adminId,
    actionType: 'MANUAL_ADJUST',
    payload: { userId, ...data },
  });
};
