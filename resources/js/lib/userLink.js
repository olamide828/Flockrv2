/** Profile link that never becomes /@undefined (deleted or missing users). Returns null when there is no profile. */
export const profileHref = (user) => (user?.username ? `/@${user.username}` : null)
export const displayName = (user) => user?.username ? `@${user.username}` : 'Deleted user'
