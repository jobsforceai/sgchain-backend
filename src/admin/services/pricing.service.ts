import { Config } from 'admin/models/Config.model';
import { AdminAuditLog } from 'admin/models/AdminAuditLog.model';

const SGC_PRICE_KEY = 'SGC_OFFICIAL_PRICE_USD';

export const getCurrentPrice = async () => {
  const priceConfig = await Config.findOne({ key: SGC_PRICE_KEY });
  return priceConfig ? parseFloat(priceConfig.value) : 0;
};

export const setPrice = async (
  newPrice: number,
  adminId: string,
  reason: string
) => {
  await Config.findOneAndUpdate(
    { key: SGC_PRICE_KEY },
    { value: newPrice.toString() },
    { upsert: true }
  );

  await AdminAuditLog.create({
    adminId,
    actionType: 'SET_PRICE',
    payload: { newPrice, reason },
  });
};
