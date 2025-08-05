import { Request, Response } from "express";

export const getHealthStatus = (_: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "API v1 is healthy",
    timestamp: new Date().toISOString(),
  });
};
