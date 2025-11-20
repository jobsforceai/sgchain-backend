import mongoose from 'mongoose';
import { Config } from 'admin/models/Config.model';
import { env } from 'core/config/env';

const SGC_PRICE_KEY = 'SGC_OFFICIAL_PRICE_USD';
const NEW_PRICE = '115';

const updateSgcPrice = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Config.findOneAndUpdate(
      { key: SGC_PRICE_KEY },
      { value: NEW_PRICE },
      { upsert: true, new: true }
    );

    console.log(`SGC price has been set to: ${NEW_PRICE}`);
  } catch (error) {
    console.error('Error setting SGC price:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

updateSgcPrice();
