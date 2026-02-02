import { z } from 'zod'

export const getProductsQuerySchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    sort: z.enum(['latest', 'price_asc', 'price_desc']).optional(),
})

export const getProductBySlugSchema = z.object({
    slug: z.string().min(1),
})
