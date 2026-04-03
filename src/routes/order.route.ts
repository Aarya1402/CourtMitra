import { Router } from "express";
import { extractOrderData, translateOrderData } from "../controllers/order.controller.js";

const router = Router();

router.post("/extract", extractOrderData);
router.post("/translate", translateOrderData);

export default router;
