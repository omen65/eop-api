import prisma from '../prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { getUserEmail } from '../helpers/auth.helper.js'

export const getContents = async (req, res) => {
    try {
        const contents = await prisma.contents.findMany({
            orderBy: {
                created_at: 'desc',
            },
        })

        return successResponse(res, contents)
    } catch (error) {
        return errorResponse(res, error.message)
    }
}

export const getContentById = async (req, res) => {
    const { id } = req.params

    try {
        const content = await prisma.contents.findUnique({
            where: { id: BigInt(id) },
        })

        if (!content) {
            return errorResponse(res, 'Content not found', 404)
        }

        return successResponse(res, content)
    } catch (error) {
        return errorResponse(res, error.message)
    }
}

export const createContent = async (req, res) => {
    try {
        const { title, content, image, created_by } = req.body

        if (!title) {
            return errorResponse(res, "Title is required", 400)
        }

        const newContent = await prisma.contents.create({
            data: {
                title,
                content: content || null,
                image: image || null,
                created_by: created_by || null,
            },
        })

        return successResponse(res, newContent, "Content created")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const updateContent = async (req, res) => {
    try {
        const { id } = req.params
        const { title, content, image, updated_by } = req.body

        const data = {}

        if (title) data.title = title
        if (content !== undefined) data.content = content || null
        if (image !== undefined) data.image = image || null
        if (updated_by) data.updated_by = updated_by

        const updatedContent = await prisma.contents.update({
            where: { id: BigInt(id) },
            data,
        })

        return successResponse(res, updatedContent, "Content updated")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const deleteContent = async (req, res) => {
    try {
        const { id } = req.params

        await prisma.contents.delete({
            where: { id: BigInt(id) },
        })

        return successResponse(res, null, "Content deleted")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const contacts = async (req, res) => {
    try {
        const contacts = await prisma.contents.findMany({
            where: {
                id: {
                    gte: BigInt(1),
                    lte: BigInt(10)
                }
            },
            orderBy: {
                id: 'asc',
            },
        })

        const data = {
            name: contacts[0]?.content || null,
            address: contacts[1]?.content || null,
            email: contacts[2]?.content || null,
            phone: contacts[3]?.content || null,
            whatsapp: contacts[4]?.content?.replace('+', '') || null,
            map: contacts[5]?.content || null,
            operational: contacts[6]?.content || null,
            instagram: contacts[7]?.content || null,
            facebook: contacts[8]?.content || null,
            tiktok: contacts[9]?.content || null,
        }

        return successResponse(res, data)
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}

export const updateContacts = async (req, res) => {
    try {
        const { name, address, email, phone, whatsapp, map, operational, instagram, facebook, tiktok } = req.body

        const userEmail = await getUserEmail(req)

        await prisma.$transaction(async (tx) => {
            const updates = [
                { id: BigInt(1), content: name },
                { id: BigInt(2), content: address },
                { id: BigInt(3), content: email },
                { id: BigInt(4), content: phone },
                { id: BigInt(5), content: whatsapp },
                { id: BigInt(6), content: map },
                { id: BigInt(7), content: operational },
                { id: BigInt(8), content: instagram },
                { id: BigInt(9), content: facebook },
                { id: BigInt(10), content: tiktok },
            ]

            for (const update of updates) {
                await tx.contents.update({
                    where: { id: update.id },
                    data: {
                        content: update.content || null,
                        updated_by: userEmail,
                    },
                })
            }
        });

        

        return successResponse(res, req.body, "Contacts updated successfully")
    } catch (error) {
        return errorResponse(res, error.message, 500)
    }
}