import bcrypt from "bcrypt";
import prisma from '../prisma.js'
import { successResponse, errorResponse } from "../utils/response.js";
import { validateAddUser, validateUpdateUser } from "../validators/user.validator.js";

export const getAllUsers = async (req, res) => {
    try {
        const { search, role, sort, sortDir, limitStart, limitEnd } = req.query

        let query = {}

        if (search) {
            query = {
                where: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                },
            }
        }
        if (role) {
            query.where = {
                ...query.where,
                role,
            }
        }
        if (sort && sortDir) {
            query.orderBy = {
                [sort]: sortDir,
            }
        }
        const users = await prisma.users.findMany({
            ...query,
            skip: limitStart ? parseInt(limitStart) : undefined,
            take: limitEnd ? parseInt(limitEnd) - (limitStart ? parseInt(limitStart) : 0) : undefined,
        })

        return successResponse(res, users)
    } catch (error) {
        return errorResponse(res, error.message)
    }
}

export const addUser = async (req, res) => {
    try {
        const { name, email, password, role, is_active } = req.body

        // Validasi input
        const errors = await validateAddUser({ email, password })
        if (Object.keys(errors).length > 0) {
            return errorResponse(res, "Gagal menambahkan user", 400, errors)
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                is_active,
            },
        })

        return successResponse(res, newUser, "User created")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const detailUser = async (req, res) => {
    try {
        const { id } = req.params

        const user = await prisma.users.findUnique({
            where: { id: Number(id) },
        })

        if (!user) {
            return errorResponse(res, "User not found", 404)
        }

        return successResponse(res, user)
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, password, role, is_active } = req.body
        const userId = Number(id)

        const errors = await validateUpdateUser({ email, password }, userId)
        if (Object.keys(errors).length > 0) {
            return errorResponse(res, "Gagal memperbarui user", 400, errors)
        }

        const data = {
            name,
            email,
            role,
            is_active,
        }

        if (password) {
            data.password = await bcrypt.hash(password, 10)
        }

        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data,
        })

        return successResponse(res, updatedUser, "User berhasil diperbarui")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params

        await prisma.users.delete({
            where: { id: Number(id) },
        })

        return successResponse(res, null, "User berhasil dihapus")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}
