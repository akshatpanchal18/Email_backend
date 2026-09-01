import { Request, Response } from "express";
import { prisma } from "../config/prisma";

export default async function checkHealth(req: Request, res: Response) {
  try {
    // await prisma.$queryRaw`SELECT 1`;
    await prisma.user.findFirst({
      select: {
        id: true,
      },
    });

    res.status(200).json({
      success: true,
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "DOWN",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}
