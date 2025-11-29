import mongoose from 'mongoose';
import { env } from '../core/config/env';
import * as marketService from '../market/services/market.service';
import * as pricingService from '../admin/services/pricing.service';
import { Candle } from '../market/models/Candle.model';
import logger from '../core/utils/logger';

// Mock logger to see output in console
// logger.info = console.log;
// logger.error = console.error;

const testDecimalPriceFlow = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected.');

    const TEST_PRICE = 123.456;
    const SYMBOL = 'sgc';

    console.log(`\n--- Step 1: Processing Price Update (Decimal: ${TEST_PRICE}) ---`);
    await marketService.processPriceUpdate(SYMBOL, TEST_PRICE);
    console.log('Price update processed.');

    console.log('\n--- Step 2: Verifying Candle Data in DB ---');
    const latestCandle = await Candle.findOne({ symbol: SYMBOL, resolution: '1' }).sort({ time: -1 });
    console.log('Latest Candle in DB:', JSON.stringify(latestCandle, null, 2));

    if (latestCandle && latestCandle.close === TEST_PRICE) {
      console.log('✅ SUCCESS: Candle stored decimal price correctly.');
    } else {
      console.log('❌ FAILURE: Candle did NOT store exact decimal price.');
    }

    console.log('\n--- Step 3: Fetching Price via PricingService ---');
    const fetchedPrice = await pricingService.getCurrentPrice();
    console.log(`Fetched Price: ${fetchedPrice}`);

    if (fetchedPrice === TEST_PRICE) {
      console.log('✅ SUCCESS: PricingService returned exact decimal price.');
    } else {
      console.log('❌ FAILURE: PricingService returned different value (maybe floored?).');
    }

  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit();
  }
};

testDecimalPriceFlow();
