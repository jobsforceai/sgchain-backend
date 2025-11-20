// src/user/services/ledger.service.ts
import { LedgerEntry } from 'user/models/LedgerEntry.model';
import { User } from 'user/models/User.model';

export const getTransactionHistory = async (userId: string) => {
  const entries = await LedgerEntry.find({ userId }).sort({ createdAt: -1 }).limit(100);

  // We can enrich the data here for the frontend
  const history = await Promise.all(entries.map(async (entry) => {
    let peerInfo = null;
    if (entry.meta.peerUserId) {
      const peer = await User.findById(entry.meta.peerUserId).select('fullName email').lean();
      peerInfo = {
        userId: peer?._id,
        fullName: peer?.fullName,
        email: peer?.email,
      };
    }

    return {
      id: entry._id,
      type: entry.type,
      currency: entry.currency,
      amount: entry.amount,
      meta: entry.meta,
      createdAt: (entry as any).createdAt,
      peerInfo,
    };
  }));

  return history;
};