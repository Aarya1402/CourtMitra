import { Router } from 'express';
import { extractOrderData } from '../controllers/gemini.controller.js';

const router = Router();

router.post('/extract', extractOrderData as any);

export default router;
