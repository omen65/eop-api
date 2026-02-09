import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
    // 1. Seed categories
    const categories = await prisma.categories.createMany({
        data: [
            { name: 'Essential Oil', slug: 'essential-oil' },
            { name: 'Blend Oil', slug: 'blend-oil' },
            { name: 'Carrier Oil', slug: 'carrier-oil' }
        ],
        skipDuplicates: true
    })

    // Ambil category buat relasi
    const essentialOil = await prisma.categories.findFirst({
        where: { slug: 'essential-oil' }
    })

    if (!essentialOil) return

    // 2. Seed products
    await prisma.products.createMany({
        data: [
            {
                category_id: essentialOil.id,
                name: 'Lavender Essential Oil',
                slug: 'lavender-essential-oil',
                description: 'Natural lavender oil for relaxation',
                image: 'lavender-img.jpg',
                price: 150000,
                discount: 30000,
                shopee_url: 'https://shopee.co.id/lavender',
                tokopedia_url: 'https://tokopedia.com/lavender',
                is_active: true
            },
            {
                category_id: essentialOil.id,
                name: 'Peppermint Essential Oil',
                slug: 'peppermint-essential-oil',
                description: 'Refreshing peppermint oil',
                image: 'peppermint.jpg',
                price: 120000,
                discount: 20000,
                is_active: true
            }
        ],
        skipDuplicates: true
    })

    // 3. Seed users
    const adminPassword = process.env.ADMIN_PASSWORD || 'defaultpassword123'
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const adminName = process.env.ADMIN_NAME || 'Admin'
    
    const password = await bcrypt.hash(adminPassword, 10)
    await prisma.users.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: adminName,
            email: adminEmail,
            password,
            role: 'admin',
            is_active: true
        }
    })

    await prisma.contents.createMany({
        data: [
            { title: 'Company Name', content: null },
            { title: 'Company Address', content: null },
            { title: 'Company Email', content: null },
            { title: 'Phone Number', content: null },
            { title: 'Whatsapp Number', content: null },
            { title: 'Google Map Embed Link', content: null },
            { title: 'Operational', content: 'Mon – Fri: 08.00 – 18.00' },
            { title: 'Instagram Link', content: null },
            { title: 'Facebook Link', content: null },
            { title: 'Tiktok Link', content: null }
        ],
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
