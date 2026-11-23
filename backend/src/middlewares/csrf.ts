import { doubleCsrf } from 'csrf-csrf'
import { Request, Response } from 'express'

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'csrf-secret-dev',
    getSessionIdentifier: (req: Request) => req.ip || 'anonymous',
    cookieName: '_csrf',
    cookieOptions: {
        sameSite: 'lax',
        path: '/',
        secure: false,
        httpOnly: true,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getCsrfTokenFromRequest: (req) => {
        const token = req.headers['x-csrf-token']
        if (Array.isArray(token)) {
            return token[0]
        }
        return token
    },
})

export const csrfProtection = doubleCsrfProtection

export const issueCsrfToken = (req: Request, res: Response) => {
    const csrfToken = generateCsrfToken(req, res)
    res.status(200).json({ csrfToken })
}
