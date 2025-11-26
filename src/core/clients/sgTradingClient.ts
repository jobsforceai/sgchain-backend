import axios from "axios";
import logger from "../utils/logger";
import { env } from "../config/env";

const client = axios.create({
  baseURL: env.SGTRADING_API_URL,
  timeout: 10_000, // 10s
  headers: {
    "Authorization": `Bearer ${env.SGTRADING_INTERNAL_SECRET}`,
  },
});

export interface VerifyRedemptionPayload {
  code: string;
}

export interface VerifyRedemptionResponse {
  status: "SUCCESS" | "FAILED";
  amountUsd?: number;
  sgTradingUserId?: string; // The ID of the user on SGTrading who generated the code
  error?: string;
}

/**
 * Calls SGTrading to verify and burn a redemption code.
 * This is the "Reverse" of generating a code.
 * If successful, SGTrading should mark the code as 'CLAIMED'/'BURNED' 
 * and return the amount to credit.
 */
export async function verifyAndBurnCode(
  payload: VerifyRedemptionPayload
): Promise<VerifyRedemptionResponse> {
  try {
    const res = await client.post<VerifyRedemptionResponse>(
      "/internal/sgchain/verify-burn", 
      payload
    );
    return res.data;
  } catch (err: any) {
    logger.error("Error calling SGTrading verify-burn", {
      message: err.message,
      code: err.code, // e.g. ECONNREFUSED
      status: err.response?.status, // e.g. 404, 500
      data: err.response?.data
    });
    if (err.response?.data) {
        return err.response.data;
    }
    throw new Error(`SGTRADING_VERIFY_BURN_FAILED: ${err.message}`);
  }
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetches historical candles from SGTrading.
 */
export async function fetchCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<CandleData[]> {
  try {
    const res = await client.get<CandleData[]>("/markets/candles", {
      params: { symbol, resolution, from, to },
    });
    return res.data;
  } catch (err: any) {
    logger.error("Error fetching candles from SGTrading", {
      message: err.message,
      status: err.response?.status,
    });
    return [];
  }
}
