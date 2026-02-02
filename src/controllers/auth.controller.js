import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from '../prisma.js'
import { successResponse, errorResponse } from "../utils/response.js";

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user || !user.is_active) {
            return errorResponse(res, "Invalid credentials", 401);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return errorResponse(res, "Invalid credentials", 401);
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        return successResponse(
            res,
            {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
            "Login success"
        );
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};
