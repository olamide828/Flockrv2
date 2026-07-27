
export function isVerificationError(error) {
    return error?.response?.status === 409;
}