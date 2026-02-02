import { errorResponse } from "../utils/response.js";

export const roleMiddleware = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return errorResponse(res, "Forbidden", 403);
        }
        next();
    };
};
