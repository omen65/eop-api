import prisma from '../prisma.js'

export const getUserEmail = async (req) => {
    try {
        if (!req.user || !req.user.id) {
            throw new Error('User not authenticated')
        }

        const user = await prisma.users.findUnique({
            where: { id: req.user.id },
            select: { email: true }
        })

        if (!user) {
            throw new Error('User not found')
        }

        return user.email
    } catch (error) {
        throw new Error(`Failed to get user email: ${error.message}`)
    }
}

export const getUserData = async (req) => {
    try {
        if (!req.user || !req.user.id) {
            throw new Error('User not authenticated')
        }

        const user = await prisma.users.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true }
        })

        if (!user) {
            throw new Error('User not found')
        }

        return user
    } catch (error) {
        throw new Error(`Failed to get user data: ${error.message}`)
    }
}
