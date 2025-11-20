// src/core/clients/sagenexClient.ts
import axios from "axios";
import logger from "../utils/logger";
import { env } from "../config/env";

const client = axios.create({
  baseURL: 'http://localhost:8080/api/v1', // Assuming the Sagenex URL for now
  timeout: 10_000, // 10s
  headers: {
    "X-Internal-Auth": `Bearer ${env.SAGENEX_INTERNAL_SECRET}`,
  },
});

export interface ExecuteTransferPayload {
  transferCode: string;
}

export interface ExecuteTransferResponse {
  status: "SUCCESS" | "FAILED";
  sagenexUserId?: string;
  transferredAmountUsd?: number;
  error?: string;
}

export async function executeTransfer(
  payload: ExecuteTransferPayload
): Promise<ExecuteTransferResponse> {
  try {
    const res = await client.post<ExecuteTransferResponse>(
      "/internal/sgchain/execute-transfer",
      payload
    );
    return res.data;
  } catch (err: any) {
    logger.error("Error calling Sagenex execute-transfer", {
      error: err.response?.data || err.message,
    });
    if (err.response?.data) {
        return err.response.data;
    }
    throw new Error("SAGENEX_EXECUTE_TRANSFER_FAILED");
  }
}
