import prisma from '../prisma.js'
import slugify from 'slugify'
import { successResponse, errorResponse } from '../utils/response.js'
import { getProductsQuerySchema } from '../validators/product.validator.js'


export const getProducts = async (req, res) => {
    const parsed = getProductsQuerySchema.safeParse(req.query)

    if (!parsed.success) {
        return errorResponse(res, parsed.error.errors, 400)
    }
    const { category, page = 1, limit = 12, sort = 'latest', search } = req.query

    try {
        const pageNumber = parseInt(page)
        const take = parseInt(limit)
        const skip = (pageNumber - 1) * take

        let whereClause = { is_active: true }

        // filter category
        if (category) {
            const cat = await prisma.categories.findUnique({
                where: { slug: category }
            })

            if (!cat) {
                return successResponse(res, {
                    data: [],
                    meta: { total: 0, page: pageNumber, last_page: 0 }
                })
            }

            whereClause.category_id = cat.id
        }

        // search (name)
        if (search) {
            whereClause.name = {
                contains: search,
            }
        }

        // sorting
        let orderBy = { created_at: 'desc' }

        switch (sort) {
            case 'oldest':
                orderBy = { created_at: 'asc' }
                break
            case 'price_asc':
                orderBy = { price: 'asc' }
                break
            case 'price_desc':
                orderBy = { price: 'desc' }
                break
        }

        // total count (buat pagination)
        const total = await prisma.products.count({
            where: whereClause
        })

        const products = await prisma.products.findMany({
            where: whereClause,
            include: {
                category: true
            },
            orderBy,
            skip,
            take
        })

        return successResponse(res, {
            data: products,
            meta: {
                total,
                page: pageNumber,
                limit: take,
                last_page: Math.ceil(total / take)
            }
        }, 'Products fetched')
    } catch (err) {
        return errorResponse(res, err.message)
    }
}


export const getProductBySlug = async (req, res) => {
    try {
        const parsed = productSlugParamSchema.safeParse(req.params)

        if (!parsed.success) {
            return errorResponse(res, parsed.error.errors, 400)
        }

        const { slug } = parsed.data

        const product = await prisma.products.findFirst({
            where: {
                slug,
                is_active: true,
            },
            include: {
                category: true,
            },
        })

        if (!product) {
            return errorResponse(res, 'Product not found', 404)
        }

        return successResponse(res, product)
    } catch (error) {
        return errorResponse(res, error.message)
    }
}

export const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            discount,
            category_id,
            shopee_url,
            tokopedia_url,
            is_active = true,
        } = req.body;

        if (!name || !category_id) {
            return errorResponse(res, "Name and category required", 400);
        }

        const slug = slugify(name, { lower: true });

        const exists = await prisma.products.findUnique({
            where: { slug },
        });

        if (exists) {
            return errorResponse(res, "Product already exists", 400);
        }

        const product = await prisma.products.create({
            data: {
                name,
                slug,
                description,
                price,
                discount,
                category_id: Number(category_id),
                shopee_url,
                tokopedia_url,
                is_active,
                created_by: req.user.id,
            },
        });

        return successResponse(res, product, "Product created");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};

/* ======================
   ADMIN: UPDATE PRODUCT
====================== */
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const data = { ...req.body };

        if (data.name) {
            data.slug = slugify(data.name, { lower: true });
        }

        data.updated_by = req.user.id;

        const product = await prisma.products.update({
            where: { id: Number(id) },
            data,
        });

        return successResponse(res, product, "Product updated");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};

/* ======================
   ADMIN: DELETE PRODUCT
====================== */
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.products.delete({
            where: { id: Number(id) },
        });

        return successResponse(res, null, "Product deleted");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};

