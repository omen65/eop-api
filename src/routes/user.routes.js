import express from 'express'
import {
    getAllUsers,
    addUser,
    detailUser,
    updateUser,
    deleteUser,
    resetPassword,
} from '../controllers/user.controller.js'

import { authMiddleware } from "../middlewares/auth.middleware.js"
import { roleMiddleware } from "../middlewares/role.middleware.js"

const router = express.Router()

router.get('/', authMiddleware, roleMiddleware("admin"), getAllUsers);
router.post('/', authMiddleware, roleMiddleware("admin"), addUser);
router.get('/:id', authMiddleware, roleMiddleware("admin"), detailUser);
router.put('/:id', authMiddleware, roleMiddleware("admin"), updateUser);
router.delete('/:id', authMiddleware, roleMiddleware("admin"), deleteUser);

router.post('/:id/reset-password', authMiddleware, roleMiddleware("admin"), resetPassword);

export default router
