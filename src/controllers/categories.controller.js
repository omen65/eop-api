import prisma from '../prisma.js'
import slugify from 'slugify'
import { successResponse, errorResponse } from '../utils/response.js'
export const getCategories = async (req, res) => {
    try {
        const categories = await prisma.categories.findMany({
            where: {
                is_active: true,
            },
            orderBy: {
                name: 'asc',
            },
            include: {
                _count: {
                    select: {
                        products: {
                            where: {
                                is_active: true,
                            },
                        },
                    },
                },
            },
        })

        // optional: rapihin response - include all category fields plus product_count
        const result = categories.map(cat => {
            const { _count, ...fields } = cat
            const prodCount = _count?.products
            const product_count = (typeof prodCount === 'number')
                ? prodCount
                : (prodCount && typeof prodCount === 'object' && prodCount.count != null)
                    ? prodCount.count
                    : 0

            return {
                ...fields,
                product_count,
            }
        })

        return successResponse(res, result)
    } catch (error) {
        return errorResponse(res, error.message)
    }
}


export const getCategoryBySlug = async (req, res) => {
    const { slug } = req.params

    try {
        const category = await prisma.categories.findUnique({
            where: { slug },
            include: {
                _count: {
                    select: {
                        products: {
                            where: {
                                is_active: true,
                            },
                        },
                    },
                },
            },
        })

        if (!category) {
            return errorResponse(res, 'Category not found', 404)
        }

        return successResponse(res, {
            id: category.id,
            name: category.name,
            slug: category.slug,
            product_count: category._count.products,
        })
    } catch (err) {
        return errorResponse(res, err.message)
    }
}

export const createCategory = async (req, res) => {
    try {
        const { name, is_active = true } = req.body;

        if (!name) {
            return errorResponse(res, "Name is required", 400);
        }

        const slug = slugify(name, {
            lower: true,
            strict: true,
        });

        const exists = await prisma.categories.findUnique({
            where: { slug },
        });

        if (exists) {
            return errorResponse(res, "Category already exists", 400);
        }

        const category = await prisma.categories.create({
            data: {
                name,
                slug,
                is_active,
            },
        });

        return successResponse(res, category, "Category created");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};


export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;

        const data = { is_active };

        if (name) {
            data.name = name;
            data.slug = slugify(name, {
                lower: true,
                strict: true,
            });
        }

        const category = await prisma.categories.update({
            where: { id: Number(id) },
            data,
        });

        return successResponse(res, category, "Category updated");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};


export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    await prisma.categories.delete({
        where: { id: Number(id) },
    });

    return successResponse(res, null, "Category deleted");
};