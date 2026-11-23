type CacheEntry = {
    expiresAt: number
    body: unknown
}

const cache = new Map<string, CacheEntry>()

export const getResponseCache = (key: string) => {
    const entry = cache.get(key)
    if (!entry) {
        return null
    }
    if (entry.expiresAt < Date.now()) {
        cache.delete(key)
        return null
    }
    return entry.body
}

export const setResponseCache = (
    key: string,
    body: unknown,
    ttlMs = 15_000
) => {
    cache.set(key, { body, expiresAt: Date.now() + ttlMs })
}

export const clearResponseCache = () => {
    cache.clear()
}
