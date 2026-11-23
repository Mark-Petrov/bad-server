import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import { csrfProtection } from './middlewares/csrf'
import errorHandler from './middlewares/error-handler'
import rateLimiter from './middlewares/rateLimiter'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()
const origin = process.env.ORIGIN_ALLOW || 'http://localhost:5173'

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
)
app.use(cookieParser())
app.use(
    cors({
        origin,
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
)

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: false, limit: '100kb' }))
app.use(json({ limit: '100kb' }))

app.use(rateLimiter)
app.use(csrfProtection)
app.use(routes)
app.use(errorHandler)

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Startup error')
    }
}

bootstrap()
