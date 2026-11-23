import { basename, join, resolve, sep } from 'path'

export const isInsideDirectory = (root: string, target: string) => {
    const resolvedRoot = resolve(root)
    const resolvedTarget = resolve(target)

    return (
        resolvedTarget === resolvedRoot ||
        resolvedTarget.startsWith(`${resolvedRoot}${sep}`)
    )
}

export const safeFileName = (fileName: string) => {
    const name = basename(fileName)
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
        return null
    }
    return name
}

export const safePublicImagePath = (publicDir: string, fileName: string) => {
    const name = safeFileName(fileName)
    if (!name) {
        return null
    }

    const imagesDir = join(publicDir, 'images')
    const fullPath = join(imagesDir, name)
    if (!isInsideDirectory(imagesDir, fullPath)) {
        return null
    }

    return fullPath
}
