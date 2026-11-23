import { NextFunction, Request, Response } from 'express'
import { unlink } from 'fs/promises'
import { constants } from 'http2'
import { basename } from 'path'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'

const MIN_FILE_SIZE = 2 * 1024
const allowedFormats = new Set(['jpeg', 'png', 'gif', 'webp'])

const removeFile = async (filePath?: string) => {
    if (!filePath) {
        return
    }
    await unlink(filePath).catch(() => undefined)
}

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    if (req.file.size <= MIN_FILE_SIZE) {
        await removeFile(req.file.path)
        return next(new BadRequestError('Файл слишком маленький'))
    }

    try {
        const metadata = await sharp(req.file.path, {
            failOn: 'error',
            limitInputPixels: 20_000_000,
            sequentialRead: true,
        }).metadata()

        if (
            !metadata.width ||
            !metadata.height ||
            !metadata.format ||
            !allowedFormats.has(metadata.format)
        ) {
            await removeFile(req.file.path)
            return next(new BadRequestError('Некорректное изображение'))
        }

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file.filename}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: basename(req.file.originalname).slice(0, 100),
        })
    } catch (_error) {
        await removeFile(req.file.path)
        return next(new BadRequestError('Некорректное изображение'))
    }
}

export default {}
