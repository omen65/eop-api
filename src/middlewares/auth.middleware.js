import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/response.js";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return errorResponse(res, "Unauthorized", 401);
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
        return errorResponse(res, "Invalid token format", 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // inject user payload ke request
        req.user = decoded; // { id, role }

        next();
    } catch (err) {
        return errorResponse(res, "Token invalid or expired", 401);
    }
};
