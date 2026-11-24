/** First visible character of a name, safe for fancy-unicode names (𝓞𝓵𝓪, emoji, etc.) that JS [0] would cut in half. */
export function firstChar(name, fallback = 'U') {
    const s = String(name ?? '').trim()
    const c = s ? Array.from(s)[0] : ''
    return (c || fallback).toUpperCase()
}
