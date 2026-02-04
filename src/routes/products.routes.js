import express from 'express'
import multer from 'multer'
import path from 'path'
import {
    getProducts,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
} from '../controllers/products.controller.js'

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router()

const upload = multer()

router.get('/', getProducts)
router.get('/:slug', getProductBySlug)

// protected
router.post("/", authMiddleware, roleMiddleware("admin"), upload.any(), createProduct);
router.put("/:id", authMiddleware, roleMiddleware("admin"), upload.any(), updateProduct);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteProduct);


export default router
