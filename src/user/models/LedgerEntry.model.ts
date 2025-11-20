import { Schema, model, Document } from 'mongoose';

export interface ILedgerEntry extends Document {
  userId: Schema.Types.ObjectId;
  walletId: Schema.Types.ObjectId;
  type:
    | 'BUY_SGC'
    | 'SELL_SGC'
    | 'ADMIN_ADJUST_CREDIT'
    | 'ADMIN_ADJUST_DEBIT'
    | 'ONCHAIN_DEPOSIT_CREDIT'
    | 'WITHDRAW_ONCHAIN_DEBIT'
    | 'BUY_SGC_BANK_DEPOSIT'
    | 'USER_INTERNAL_TRANSFER_DEBIT'
    | 'USER_INTERNAL_TRANSFER_CREDIT'
    | 'DEPOSIT_FROM_SAGENEX'
    | 'DEPOSIT_FROM_SAGENEX_USD'
    | 'BUY_SGC_WITH_USD_BALANCE'
    | 'SELL_SGC_DEBIT'
    | 'SELL_SGC_CREDIT'
    | 'WITHDRAWAL_REQUEST_DEBIT'
    | 'WITHDRAWAL_REJECTED_CREDIT';
  currency: 'SGC' | 'USD';
  amount: number;
  meta: Record<string, any>;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: {
      type: String,
      enum: [
        'BUY_SGC',
        'SELL_SGC',
        'ADMIN_ADJUST_CREDIT',
        'ADMIN_ADJUST_DEBIT',
        'ONCHAIN_DEPOSIT_CREDIT',
        'WITHDRAW_ONCHAIN_DEBIT',
        'BUY_SGC_BANK_DEPOSIT',
        'USER_INTERNAL_TRANSFER_DEBIT',
        'USER_INTERNAL_TRANSFER_CREDIT',
        'DEPOSIT_FROM_SAGENEX',
        'DEPOSIT_FROM_SAGENEX_USD',
        'BUY_SGC_WITH_USD_BALANCE',
        'SELL_SGC_DEBIT',
        'SELL_SGC_CREDIT',
        'WITHDRAWAL_REQUEST_DEBIT',
        'WITHDRAWAL_REJECTED_CREDIT',
      ],
      required: true,
    },
    currency: { type: String, enum: ['SGC', 'USD'], required: true },
    amount: { type: Number, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LedgerEntry = model<ILedgerEntry>(
  'LedgerEntry',
  ledgerEntrySchema
);
