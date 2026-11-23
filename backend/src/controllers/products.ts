import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product, { IFile } from '../models/product'
import movingFile from '../utils/movingFile'
import { parsePagination } from '../utils/pagination'
import { clearResponseCache, getResponseCache, setResponseCache } from '../utils/responseCache'
import { safeFileName } from '../utils/safePath'

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, skip } = parsePagination(
            req.query.page,
            req.query.limit,
            5,
            50
        )
        const cacheKey = `products:${page}:${limit}`
        const cached = getResponseCache(cacheKey)
        res.setHeader('Cache-Control', 'public, max-age=15')
        if (cached) {
            return res.send(cached)
        }
        const options = {
            skip,
            limit,
        }
        const products = await Product.find({}, null, options)
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / limit)
        const body = {
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
        }
        setResponseCache(cacheKey, body)
        return res.send(body)
    } catch (err) {
        return next(err)
    }
}

const normalizeImage = (image: IFile) => {
    const fileName = safeFileName(image.fileName)
    if (!fileName) {
        throw new BadRequestError('Некорректное имя файла')
    }

    movingFile(
        fileName,
        join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
        join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
    )

    return {
        fileName: `/${process.env.UPLOAD_PATH}/${fileName}`,
        originalName: safeFileName(image.originalName || 'image') || 'image',
    }
}

// POST /product
const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body
        const safeImage = image ? normalizeImage(image) : image

        clearResponseCache()
        const product = await Product.create({
            description,
            image: safeImage,
            category,
            price,
            title,
        })
        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// PUT /product
const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { image, title, description, category, price } = req.body
        const update: {
            title?: string
            description?: string
            category?: string
            price?: number | null
            image?: IFile
        } = {}

        if (typeof title === 'string') {
            update.title = title
        }
        if (typeof description === 'string') {
            update.description = description
        }
        if (typeof category === 'string') {
            update.category = category
        }
        if (price === null || typeof price === 'number') {
            update.price = price
        }
        if (image) {
            update.image = normalizeImage(image)
        }

        clearResponseCache()
        const product = await Product.findByIdAndUpdate(
            productId,
            {
                $set: update,
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// DELETE /product
const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        clearResponseCache()
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
