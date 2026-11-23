import { NextFunction, Request, Response } from 'express'
import { FilterQuery } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import escapeRegExp from '../utils/escapeRegExp'
import { parsePagination, parseSort } from '../utils/pagination'

const toFiniteNumber = (value: unknown) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined
    }
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
}

const toValidDate = (value: unknown) => {
    if (typeof value !== 'string' || value.length > 40) {
        return undefined
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
}

// TODO: Добавить guard admin
// eslint-disable-next-line max-len
// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query
        const { page, limit, skip } = parsePagination(
            req.query.page,
            req.query.limit,
            10,
            10
        )

        const filters: FilterQuery<Partial<IUser>> = {}

        const registrationFrom = toValidDate(registrationDateFrom)
        const registrationTo = toValidDate(registrationDateTo)
        if (registrationFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: registrationFrom,
            }
        }
        if (registrationTo) {
            const endOfDay = new Date(registrationTo)
            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        const lastFrom = toValidDate(lastOrderDateFrom)
        const lastTo = toValidDate(lastOrderDateTo)
        if (lastFrom) {
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: lastFrom,
            }
        }
        if (lastTo) {
            const endOfDay = new Date(lastTo)
            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
        }

        const amountFrom = toFiniteNumber(totalAmountFrom)
        const amountTo = toFiniteNumber(totalAmountTo)
        if (amountFrom !== undefined) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: amountFrom,
            }
        }
        if (amountTo !== undefined) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: amountTo,
            }
        }

        const countFrom = toFiniteNumber(orderCountFrom)
        const countTo = toFiniteNumber(orderCountTo)
        if (countFrom !== undefined) {
            filters.orderCount = {
                ...filters.orderCount,
                $gte: countFrom,
            }
        }
        if (countTo !== undefined) {
            filters.orderCount = {
                ...filters.orderCount,
                $lte: countTo,
            }
        }

        if (search !== undefined && typeof search !== 'string') {
            return next(new BadRequestError('Некорректный поисковый запрос'))
        }

        if (typeof search === 'string' && search.length > 0) {
            const searchRegex = new RegExp(
                escapeRegExp(search.slice(0, 100)),
                'i'
            )
            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const sort = parseSort(
            sortField,
            sortOrder,
            ['createdAt', 'name', 'totalAmount', 'orderCount', 'lastOrderDate'],
            'createdAt'
        )

        const options = {
            sort,
            skip,
            limit,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / limit)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: page,
                pageSize: limit,
            },
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id).populate([
            'orders',
            'lastOrder',
        ])
        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, email, phone } = req.body ?? {}
        const update: { name?: string; email?: string; phone?: string } = {}
        if (typeof name === 'string') {
            update.name = name
        }
        if (typeof email === 'string') {
            update.email = email
        }
        if (typeof phone === 'string') {
            update.phone = phone
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            update,
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])
        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// TODO: Добавить guard admin
// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
