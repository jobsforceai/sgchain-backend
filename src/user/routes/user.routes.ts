import { Router } from 'express';
import * as walletController from 'user/controllers/wallet.controller';
import * as marketController from 'user/controllers/market.controller';
import * as buyController from 'user/controllers/buy.controller';
import * as transferController from 'user/controllers/transfer.controller';
import * as redeemController from 'user/controllers/redeem.controller';
import * as ledgerController from 'user/controllers/ledger.controller';
import * as sellController from 'user/controllers/sell.controller';
import * as kycController from 'user/controllers/kyc.controller';
import * as withdrawalController from 'user/controllers/withdrawal.controller';
import { authUser } from 'core/middlewares/authUser';
import { authWalletAccess } from 'core/middlewares/authWalletAccess';

const router = Router();

// Wallet and Market Data
router.get('/me/wallet', authUser, walletController.getMyWallet);
router.get('/market/sgc-price', marketController.getSgcPrice);

// Wallet PIN and Details
router.post('/me/wallet/set-pin', authUser, walletController.setPin);
router.post('/me/wallet/verify-pin', authUser, walletController.verifyPin);
router.get('/me/wallet/details', authWalletAccess, walletController.getDetails);

// Redeem Sagenex Transfer
router.post('/me/redeem-transfer', authUser, redeemController.redeemTransfer);
// Redeem SGTrading Code (Reverse Transfer)
router.post('/me/redeem/sgtrading', authUser, redeemController.redeemSgTrading);

// Buy SGC Flow
router.get('/buy/bank-accounts', buyController.getBankAccounts);
router.post('/me/buy-sgc', authUser, buyController.initiateBuyRequest);
router.post('/me/buy-sgc/balance', authUser, buyController.buySgcWithBalance);
router.get('/me/buy-sgc/requests', authUser, buyController.getMyBuyRequests);

// Sell SGC Flow
router.post('/me/sell-sgc', authUser, sellController.sellSgc);

// KYC Flow (New Multi-Document Flow)
router.post('/me/kyc/upload', authUser, kycController.uploadDocument);
router.post('/me/kyc/submit', authUser, kycController.submitApplication);
router.get('/me/kyc/status', authUser, kycController.getKycStatus);

// Withdrawal Flow
router.post('/me/withdrawals/request', authUser, withdrawalController.requestWithdrawal);
router.get('/me/withdrawals', authUser, withdrawalController.getWithdrawalHistory);

// Internal Transfers
router.post('/me/transfer/sgc', authUser, transferController.internalTransfer);
router.get('/me/transfers/sgc', authUser, transferController.getTransferHistory);

// External Transfers (SGTrading)
router.post('/me/transfer/external', authUser, transferController.initiateExternalTransfer);
router.get('/me/transfers/external', authUser, transferController.getExternalTransferHistory);

// Transaction History
router.get('/me/history', authUser, ledgerController.getHistory);

export { router };
