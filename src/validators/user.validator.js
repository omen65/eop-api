import prisma from '../prisma.js'

export const validateAddUser = async (data) => {
    const errors = {}

    if (!data.email) {
        errors.email = "Email diperlukan"
    } else {
        const existingUser = await prisma.users.findUnique({
            where: { email: data.email }
        })
        if (existingUser) {
            errors.email = "Email sudah digunakan"
        }
    }

    if (!data.password) {
        errors.password = "Password diperlukan"
    } else if (data.password.length < 6) {
        errors.password = "Password minimal 6 karakter"
    }

    return errors
}

export const validateUpdateUser = async (data, userId) => {
    const errors = {}

    if (data.email) {
        const existingUser = await prisma.users.findUnique({
            where: { email: data.email }
        })
        if (existingUser && existingUser.id !== userId) {
            errors.email = "Email sudah digunakan"
        }
    }
    

    if (data.password && data.password.length < 6) {
        errors.password = "Password minimal 6 karakter"
    }

    return errors
}

export const validateResetPassword = async (data) => {
    const errors = {}

    if (!data.password) {
        errors.password = "Password diperlukan"
    } else if (data.password.length < 6) {
        errors.password = "Password minimal 6 karakter"
    }

    if (!data.confirmPassword) {
        errors.confirmPassword = "Confirm password diperlukan"
    } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Password tidak cocok"
    }

    return errors
}
