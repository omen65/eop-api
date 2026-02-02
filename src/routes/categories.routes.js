import express from 'express'
import {
    getCategories,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/categories.controller.js'

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router()

router.get('/', getCategories)
router.get('/:slug', getCategoryBySlug)

// admin only
router.post("/", authMiddleware, roleMiddleware("admin"), createCategory);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateCategory);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteCategory);

export default router
