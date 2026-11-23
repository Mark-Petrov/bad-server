import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { isInsideDirectory } from '../utils/safePath'

export default function serveStatic(baseDir: string) {
    const root = path.resolve(baseDir)

    return (req: Request, res: Response, next: NextFunction) => {
        let relativePath = req.path
        try {
            relativePath = decodeURIComponent(req.path)
        } catch (_error) {
            return next()
        }

        if (relativePath.includes('\0')) {
            return next()
        }

        const filePath = path.resolve(root, `.${relativePath}`)
        if (!isInsideDirectory(root, filePath)) {
            return next()
        }

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                return next()
            }
            res.setHeader('Cache-Control', 'public, max-age=86400')
            return res.sendFile(filePath, (sendError) => {
                if (sendError) {
                    next(sendError)
                }
            })
        })
    }
}
