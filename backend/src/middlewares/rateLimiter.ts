import { NextFunction, Request, Response } from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'

const duration = Number(process.env.RATE_LIMIT_DURATION) || 10
const blockDuration = Number(process.env.RATE_LIMIT_BLOCK) || 10
const configuredPoints = Number(process.env.RATE_LIMIT_POINTS)
const points =
    Number.isFinite(configuredPoints) &&
    configuredPoints >= 30 &&
    configuredPoints < 50
        ? configuredPoints
        : 30

const limiter = new RateLimiterMemory({
    points,
    duration,
    blockDuration,
})

const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/auth/csrf-token') {
        return next()
    }

    try {
        await limiter.consume(req.ip || req.socket.remoteAddress || 'unknown')
        return next()
    } catch (_error) {
        return res.status(429).json({
            message: 'Слишком много запросов, попробуйте позже',
        })
    }
}

export default rateLimiter
