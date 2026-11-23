const allowedTags = new Set([
    'a',
    'b',
    'blockquote',
    'br',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'i',
    'li',
    'ol',
    'p',
    'span',
    'strong',
    'u',
    'ul',
])

const hrefPattern = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i

const sanitizeAttributes = (tag: string, rawAttrs: string) => {
    if (tag !== 'a') {
        return ''
    }

    const hrefMatch = rawAttrs.match(hrefPattern)
    const href = hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || ''
    if (!/^https?:\/\//i.test(href)) {
        return ''
    }

    return ` href="${href.replace(/"/g, '')}" rel="noopener noreferrer"`
}

const sanitizeRichText = (value: string) => {
    const withoutDangerousBlocks = value.replace(
        /<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
        ''
    )

    return withoutDangerousBlocks.replace(
        /<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi,
        (_match, slash: string, rawTag: string, rawAttrs: string) => {
            const tag = rawTag.toLowerCase()
            if (!allowedTags.has(tag)) {
                return ''
            }
            if (tag === 'br') {
                return '<br>'
            }
            if (slash) {
                return `</${tag}>`
            }
            return `<${tag}${sanitizeAttributes(tag, rawAttrs)}>`
        }
    )
}

export default sanitizeRichText
