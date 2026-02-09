import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import productsRoutes from './routes/products.routes.js'
import categoriesRoutes from './routes/categories.routes.js'
import authRoutes from './routes/auth.routes.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/products', productsRoutes)
app.use('/categories', categoriesRoutes)
app.use('/auth', authRoutes)

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
})
