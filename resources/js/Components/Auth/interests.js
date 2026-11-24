// Same labels the backend already maps to categories (CategoryMatcher), now with an emoji each.
export const INTERESTS = [
    { label: 'Fashion & Clothing', emoji: '👗' },
    { label: 'Beauty & Skincare', emoji: '💄' },
    { label: 'Electronics & Gadgets', emoji: '📱' },
    { label: 'Food & Drinks', emoji: '🍲' },
    { label: 'Home & Living', emoji: '🏡' },
    { label: 'Health & Wellness', emoji: '🌿' },
    { label: 'Accessories & Jewelry', emoji: '💍' },
    { label: 'Kids & Baby', emoji: '🧸' },
    { label: 'Books & Education', emoji: '📚' },
    { label: 'Gaming', emoji: '🎮' },
    { label: 'Auto Parts', emoji: '🚗' },
    { label: 'Sports & Fitness', emoji: '⚽' },
    { label: 'Organic & Natural', emoji: '🥬' },
    { label: 'Art & Crafts', emoji: '🎨' },
    { label: 'Other', emoji: '✨' },
]
export const emojiFor = (label) => INTERESTS.find(i => i.label === label)?.emoji ?? '✨'
