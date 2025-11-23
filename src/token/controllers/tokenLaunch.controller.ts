import { Request, Response, NextFunction } from 'express';
import * as tokenService from 'token/services/tokenLaunch.service';
import logger from 'core/utils/logger';

export const createDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const result = await tokenService.createDraft(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const result = await tokenService.updateDraft(userId, id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    logger.info(`[TokenController] getDetails called for ID: ${id}`);
    const result = await tokenService.getDetails(id);
    if (!result) {
        logger.warn(`[TokenController] Token not found for ID: ${id}`);
        return res.status(404).json({ message: 'Token not found' });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const listMyTokens = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const result = await tokenService.getUserTokens(userId);
    res.json({ items: result });
  } catch (error) {
    next(error);
  }
};

export const submitToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const result = await tokenService.deployToken(userId, id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
