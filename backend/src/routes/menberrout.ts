import express from "express";
import { authenticate } from "../Middleware/authMiddleware";
import { getUsersByIds } from "../controllers/membercontroller";

const router = express.Router();

router.post("/by-ids", authenticate, getUsersByIds);

export default router;
