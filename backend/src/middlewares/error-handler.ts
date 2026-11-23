import { ErrorRequestHandler } from 'express'
import multer from 'multer'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError || err?.type === 'entity.too.large') {
        const statusCode = err?.type === 'entity.too.large' ? 413 : 400
        res.status(statusCode).send({
            message:
                statusCode === 413
                    ? 'Слишком большой запрос'
                    : 'Ошибка загрузки файла',
        })
        return
    }

    const statusCode = err.statusCode || err.status || 500
    const message =
        statusCode === 500 ? 'На сервере произошла ошибка' : err.message

    if (statusCode >= 500) {
        console.error(err?.message || 'Internal server error')
    }

    res.status(statusCode).send({ message })
}

export default errorHandler
