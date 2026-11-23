import { NextFunction, Request, Response } from 'express'
import Joi from 'joi'
import BadRequestError from '../errors/bad-request-error'

type RequestSchema = {
    body?: Joi.ObjectSchema
    params?: Joi.ObjectSchema
    query?: Joi.ObjectSchema
}

export const celebrate =
    (schema: RequestSchema) =>
    (req: Request, _res: Response, next: NextFunction) => {
        const keys = ['params', 'query', 'body'] as const

        try {
            keys.forEach((key) => {
                const part = schema[key]
                if (!part) {
                    return
                }

                const { error, value } = part.validate(req[key], {
                    abortEarly: true,
                    allowUnknown: true,
                    stripUnknown: true,
                    convert: true,
                })

                if (error) {
                    throw new BadRequestError(
                        error.details[0]?.message || 'Некорректные данные'
                    )
                }

                req[key] = value
            })
            return next()
        } catch (error) {
            return next(error)
        }
    }

export { Joi }
