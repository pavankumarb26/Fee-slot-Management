import { Router } from 'express';
import { login, staffLoginController, logoutController, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/student/login', login);
router.post('/staff/login', staffLoginController);
router.post('/logout', authenticate, logoutController);
router.get('/me', authenticate, getMe);

export default router;