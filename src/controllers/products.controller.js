import prisma from '../prisma.js'
import slugify from 'slugify'
import { successResponse, errorResponse } from '../utils/response.js'
import { getProductsQuerySchema, getProductBySlugSchema } from '../validators/product.validator.js'
import { uploadGCS, deleteGCS } from '../services/google_cloud_storage.services.js'
import * as XLSX from 'xlsx'


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

        let data = products.map(product => {
            if (product.image) {
                try {
                    const images = JSON.parse(product.image);
                    return { ...product, images: images };
                } catch (e) {
                    return { ...product, images: [] };
                }
            }
            return { ...product, images: [] };
        });

        return successResponse(res, {
            data: data,
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
        const parsed = getProductBySlugSchema.safeParse(req.params)

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

        let data = product
        if (product.image) {
            try {
                const images = JSON.parse(product.image)
                data = { ...product, images }
            } catch (e) {
                data = { ...product, images: [] }
            }
        } else {
            data = { ...product, images: [] }
        }

        return successResponse(res, data)
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

        // Handle images
        let image = null;
        if (req.files && req.files.length > 0) {
            const imageFiles = req.files.filter(file => file.fieldname.startsWith('images'));
            console.log('[Products Create] Incoming files:', (req.files || []).length);
            imageFiles.forEach((f, idx) => {
                console.log(`[Products Create] File[${idx}]`, {
                    fieldname: f.fieldname,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                    size: (f.size ?? f.buffer?.length ?? null),
                });
            });
            if (imageFiles.length > 0) {
                try {
                    const uploadPromises = imageFiles.map(file => uploadGCS(file, 'products'));
                    const imageUrls = await Promise.all(uploadPromises);
                    image = JSON.stringify(imageUrls);
                } catch (uploadErr) {
                    console.error('[Products Create] Upload error:', uploadErr?.code, uploadErr?.message);
                    console.error('[Products Create] Stack:', uploadErr?.stack);
                    console.error('[Products Create] APP_ENV:', process.env.APP_ENV, 'Bucket:', process.env.GOOGLE_CLOUD_BUCKET);
                    return errorResponse(res, `Upload failed: ${uploadErr.message}`, 500);
                }
            }
        }

        const product = await prisma.products.create({
            data: {
                name,
                slug,
                description,
                image,
                price: price ? parseFloat(price) : null,
                discount: discount ? parseFloat(discount) : null,
                category_id: Number(category_id),
                shopee_url,
                tokopedia_url,
                is_active: is_active === '1' || is_active === true,
                created_by: req.user.id,
            },
        });

        return successResponse(res, product, "Product created");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await prisma.products.findUnique({
            where: { id: Number(id) },
            include: {
                category: true,
            },
        });

        if (!product) {
            return errorResponse(res, "Product not found", 404);
        }

        let data = product;
        if (product.image) {
            try {
                const images = JSON.parse(product.image);
                data = { ...product, images };
            } catch (e) {
                data = { ...product, images: [] };
            }
        } else {
            data = { ...product, images: [] };
        }

        return successResponse(res, data, "Product fetched");
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
}

/* ======================
   ADMIN: UPDATE PRODUCT
====================== */
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.body) {
            return errorResponse(res, "Request body is required", 400);
        }

        const {
            name,
            description,
            price,
            discount,
            category_id,
            shopee_url,
            tokopedia_url,
            is_active,
        } = req.body;

        const data = {};

        if (name) {
            data.name = name;
            data.slug = slugify(name, { lower: true });
        }
        if (description !== undefined) data.description = description;
        if (price !== undefined) data.price = price ? parseFloat(price) : null;
        if (discount !== undefined) data.discount = discount ? parseFloat(discount) : null;
        if (category_id !== undefined) data.category_id = Number(category_id);
        if (shopee_url !== undefined) data.shopee_url = shopee_url;
        if (tokopedia_url !== undefined) data.tokopedia_url = tokopedia_url;
        if (is_active !== undefined) data.is_active = is_active === '1' || is_active === true;

        const currentProduct = await prisma.products.findUnique({
            where: { id: Number(id) },
        });

        if (!currentProduct) {
            return errorResponse(res, "Product not found", 404);
        }

        let oldImages = [];
        if (currentProduct.image) {
            try {
                oldImages = JSON.parse(currentProduct.image);
            } catch (e) {
                oldImages = [];
            }
        }

        let newImages = [];
        const imageUrls = req.body.images || [];
        const newImageFiles = (req.files || []).filter(file => file.fieldname.startsWith('images'));

        if (Array.isArray(imageUrls)) {
            newImages = imageUrls.filter(url => url && typeof url === 'string');
        } else if (typeof imageUrls === 'object' && imageUrls !== null) {
            const sortedKeys = Object.keys(imageUrls)
                .filter(key => !isNaN(key))
                .sort((a, b) => Number(a) - Number(b));
            newImages = sortedKeys.map(key => imageUrls[key]).filter(url => url && typeof url === 'string');
        }

        // Upload new image files
        if (newImageFiles && newImageFiles.length > 0) {
            console.log('[Products Update] New image files:', newImageFiles.length);
            newImageFiles.forEach((f, idx) => {
                console.log(`[Products Update] File[${idx}]`, {
                    fieldname: f.fieldname,
                    originalname: f.originalname,
                    mimetype: f.mimetype,
                    size: (f.size ?? f.buffer?.length ?? null),
                });
            });
            try {
                const uploadPromises = newImageFiles.map(file => uploadGCS(file, 'products'));
                const uploadedUrls = await Promise.all(uploadPromises);
                newImages = [...newImages, ...uploadedUrls];
            } catch (uploadErr) {
                console.error('[Products Update] Upload error:', uploadErr?.code, uploadErr?.message);
                console.error('[Products Update] Stack:', uploadErr?.stack);
                console.error('[Products Update] APP_ENV:', process.env.APP_ENV, 'Bucket:', process.env.GOOGLE_CLOUD_BUCKET);
                return errorResponse(res, `Upload failed: ${uploadErr.message}`, 500);
            }
        }

        const imagesToDelete = oldImages.filter(oldUrl => !newImages.includes(oldUrl));
        
        if (imagesToDelete.length > 0) {
            try {
                for (const url of imagesToDelete) {
                    const urlParts = url.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    const directory = 'products';
                    console.log(`Deleting from GCS: ${directory}/${filename}`);
                    await deleteGCS(directory, filename);
                }
            } catch (deleteErr) {
                console.error('Error deleting images from GCS:', deleteErr);
            }
        }

        if (newImages.length > 0) {
            data.image = JSON.stringify(newImages);
        } else if (newImageFiles.length === 0 && !req.body.images) {
            data.image = currentProduct.image;
        } else {
            data.image = null;
        }

        data.updated_by = req.user.id;

        const product = await prisma.products.update({
            where: { id: Number(id) },
            data,
            include: {
                category: true,
            },
        });

        let responseData = product;
        if (product.image) {
            try {
                const images = JSON.parse(product.image);
                responseData = { ...product, images };
            } catch (e) {
                responseData = { ...product, images: [] };
            }
        } else {
            responseData = { ...product, images: [] };
        }

        return successResponse(res, responseData, "Product updated");
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

/* ======================
   ADMIN: IMPORT PRODUCTS FROM EXCEL
====================== */
export const importProducts = async (req, res) => {
    try {
        if (!req.file) {
            return errorResponse(res, "Excel file is required", 400);
        }

        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            return errorResponse(res, "Excel file is empty", 400);
        }

        // Ambil semua categories untuk mapping
        const categories = await prisma.categories.findMany({
            select: { id: true, name: true }
        });

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name.toLowerCase()] = cat.id;
        });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Process each row
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Map Excel columns ke field database
                const productName = row['Nama Produk'];
                const categoryName = row['Kategori'];
                const priceRaw = row['Harga Awal'];
                const discountRaw = row['Diskon'];
                const shopeeUrl = row['Link Shopee'];
                const tokopediaUrl = row['Link Tokopedia'];

                // Validasi
                if (!productName) {
                    results.failed++;
                    results.errors.push(`Row ${i + 2}: Nama Produk tidak boleh kosong`);
                    continue;
                }

                // Parse price - handle format: "Rp8.500", "8.500", "8500", etc
                const parsePrice = (value) => {
                    if (!value) return null;
                    const cleaned = String(value).replace(/[Rp.,\s]/g, '');
                    const parsed = parseInt(cleaned);
                    return isNaN(parsed) ? null : parsed;
                };

                const price = parsePrice(priceRaw);
                const discount = parsePrice(discountRaw);

                // Cari atau buat category_id berdasarkan nama category
                let categoryId = null;
                if (categoryName) {
                    const categoryKey = categoryName.toLowerCase();
                    
                    // Cek apakah kategori sudah ada di map
                    if (categoryMap[categoryKey]) {
                        categoryId = categoryMap[categoryKey];
                    } else {
                        // Kategori belum ada, create baru
                        try {
                            const newCategory = await prisma.categories.create({
                                data: {
                                    name: categoryName,
                                    slug: slugify(categoryName, { lower: true }),
                                    is_active: true
                                }
                            });
                            categoryId = newCategory.id;
                            categoryMap[categoryKey] = categoryId; // Simpan ke map untuk row selanjutnya
                        } catch (catError) {
                            results.failed++;
                            results.errors.push(`Row ${i + 2}: Gagal membuat kategori '${categoryName}': ${catError.message}`);
                            continue;
                        }
                    }
                }

                const slug = slugify(productName, { lower: true });

                // Cek apakah product sudah ada (skip atau update bisa disesuaikan)
                const existingProduct = await prisma.products.findUnique({
                    where: { slug }
                });

                if (existingProduct) {
                    // Update existing product
                    await prisma.products.update({
                        where: { slug },
                        data: {
                            name: productName,
                            category_id: categoryId,
                            price: price,
                            discount: discount,
                            shopee_url: shopeeUrl || null,
                            tokopedia_url: tokopediaUrl || null,
                            updated_by: req.user.id,
                        }
                    });
                } else {
                    // Create new product
                    await prisma.products.create({
                        data: {
                            name: productName,
                            slug,
                            category_id: categoryId,
                            price: price,
                            discount: discount,
                            shopee_url: shopeeUrl || null,
                            tokopedia_url: tokopediaUrl || null,
                            is_active: true,
                            created_by: req.user.id,
                        }
                    });
                }

                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }

        return successResponse(res, results, `Import completed: ${results.success} success, ${results.failed} failed`);
    } catch (err) {
        return errorResponse(res, err.message, 500);
    }
};

