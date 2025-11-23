import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import { Wallet } from '../user/models/Wallet.model';
import * as authService from '../user/services/auth.service';
import * as externalTransferService from '../user/services/externalTransfer.service';
import * as sgchainClient from '../core/clients/sgchainClient';
import logger from '../core/utils/logger';

// Test Configuration
const TEST_AMOUNT_SGC = 1.0;

const run = async () => {
  try {
    logger.info('Initializing External Transfer Test...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB.');

    // 1. Create a unique test user
    const email = `test-transfer-${Date.now()}@example.com`;
    const password = 'Password123!';
    
    logger.info(`Creating test user: ${email}...`);
    // This creates the user + on-chain wallet (address & encrypted key)
    const user = await authService.registerUser({
      email,
      fullName: 'Test External Transfer User',
      password
    });
    
    if (!user.onchainAddress) {
      throw new Error('User created but has no on-chain address.');
    }
    logger.info(`User created. ID: ${user._id}`);
    logger.info(`On-Chain Address: ${user.onchainAddress}`);

    // 2. Fund the user (DB Balance + On-Chain Balance)
    logger.info('Funding user...');
    
    // 2a. DB Balance
    await Wallet.findOneAndUpdate(
        { userId: user._id }, 
        { $set: { sgcBalance: 100, fiatBalanceUsd: 0 } }, // Give plenty of DB balance
        { upsert: true }
    );
    logger.info('DB Wallet funded with 100 SGC.');

    // 2b. On-Chain Balance (Essential for the transfer to succeed)
    // We send some SGC from Hot Wallet to this new user so they can send it back/out
    try {
        logger.info(`Sending ${TEST_AMOUNT_SGC * 2} SGC from Hot Wallet to User for gas/transfer...`);
        const { txHash: fundTx } = await sgchainClient.sendSgcFromHotWallet({
            to: user.onchainAddress,
            amountSgc: TEST_AMOUNT_SGC * 2, // Send enough for the test + gas
        });
        logger.info(`Funding Tx Hash: ${fundTx}`);
        
        // Wait a bit for the chain to process (simple wait)
        logger.info('Waiting 5 seconds for block confirmation...');
        await new Promise(r => setTimeout(r, 5000));
    } catch (err: any) {
        logger.warn('On-chain funding failed. This might be expected if running locally without a real chain/hot wallet setup.');
        logger.warn(`Error: ${err.message}`);
        // We continue, but the next step might fail if it relies on real chain interaction
    }

    // 3. Step 1: User initiates transfer
    logger.info('--- STEP 1: Creating External Transfer ---');
    try {
        const transferResult = await externalTransferService.createExternalTransfer(
            user._id as string,
            TEST_AMOUNT_SGC
        );
        
        logger.info('Transfer Created Successfully!');
        logger.info(`Transfer ID: ${transferResult.transferId}`);
        logger.info(`Code: ${transferResult.code}`);
        logger.info(`USD Amount: $${transferResult.amountUsd}`);
        
        // 4. Step 2: SGTrading redeems the code
        logger.info('--- STEP 2: Redeeming Code (SGTrading Side) ---');
        
        const redeemResult = await externalTransferService.redeemExternalTransfer(transferResult.code);
        
        logger.info('Code Redeemed Successfully!');
        logger.info(`Status: ${redeemResult.status}`);
        logger.info(`Credited USD: ${redeemResult.amountUsd}`);

        // 5. Verification
        const finalTransfer = await externalTransferService.getMyExternalTransfers(user._id as string);
        const latest = finalTransfer[0];
        if (latest.status === 'CLAIMED') {
            logger.info('✅ TEST PASSED: Cycle complete. Transfer is marked CLAIMED.');
        } else {
            logger.error(`❌ TEST FAILED: Status is ${latest.status}`);
        }

    } catch (error: any) {
        logger.error('❌ Error during transfer flow:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            logger.error('Hint: The test user did not have enough on-chain SGC (gas + amount). Ensure Hot Wallet has funds and RPC is working.');
        }
    }

  } catch (error: any) {
    logger.error('Script Error:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected.');
    process.exit(0);
  }
};

run();
