export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_MB = 5

const ACCEPT_SET = new Set<string>(ALLOWED_IMAGE_TYPES)

export function validateImageFile(file: File): string | null {
  if (!ACCEPT_SET.has(file.type)) {
    return 'Please upload a JPEG, PNG or WebP image.'
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `Image must be under ${MAX_IMAGE_MB}MB.`
  }
  return null
}

export function mapStorageError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('exceeded')) return 'File is too large.'
  if (lower.includes('mime')) return 'Unsupported file type.'
  return 'Upload failed. Please try again.'
}

export function mapDatabaseError(): string {
  return 'Could not save your result. Please try again.'
}
