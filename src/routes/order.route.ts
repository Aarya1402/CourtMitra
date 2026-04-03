import { Router } from "express";
import { extractOrderData, translateOrderData } from "../controllers/order.controller.js";

const router = Router();

router.post("/extract", extractOrderData as any);
router.post("/translate", translateOrderData as any);

export default router;
