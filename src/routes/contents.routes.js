import express from 'express'
import {
    getContents,
    getContentById,
    createContent,
    updateContent,
    deleteContent,
    contacts,
    updateContacts,
} from '../controllers/contents.controller.js'

import { authMiddleware } from "../middlewares/auth.middleware.js"
import { roleMiddleware } from "../middlewares/role.middleware.js"

const router = express.Router()

router.get('/', getContents)
router.get("/contacts", authMiddleware, roleMiddleware("admin"), contacts)
router.put("/contacts", authMiddleware, roleMiddleware("admin"), updateContacts)
router.get('/:id', getContentById)

// admin only
router.post("/", authMiddleware, roleMiddleware("admin"), createContent)
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateContent)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteContent)

export default router
