import { Request, Response } from "express";
import { prisma } from "../config/db";

/**
 * POST /api/user/by-ids
 * body: { userIds: string[] }
 */
export const getUsersByIds = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    // ✅ Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,          // optional
        profileImage: true,
        onlineStatus: true,
        lastSeen: true,
      },
    });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("getUsersByIds error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
