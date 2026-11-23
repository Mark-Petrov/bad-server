export const parsePagination = (
    pageRaw: unknown,
    limitRaw: unknown,
    defaultLimit: number,
    maxLimit: number
) => {
    const pageNumber = Number(pageRaw)
    const limitNumber = Number(limitRaw)
    const page =
        Number.isFinite(pageNumber) && pageNumber > 0
            ? Math.floor(pageNumber)
            : 1
    const requestedLimit =
        Number.isFinite(limitNumber) && limitNumber > 0
            ? Math.floor(limitNumber)
            : defaultLimit
    const limit = Math.min(requestedLimit, maxLimit)

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    }
}

export const parseSort = (
    field: unknown,
    order: unknown,
    allowed: string[],
    fallback: string
) => {
    const sortField =
        typeof field === 'string' && allowed.includes(field) ? field : fallback
    const direction = order === 'asc' ? 1 : -1

    return { [sortField]: direction }
}
