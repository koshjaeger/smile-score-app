import {
  mapDatabaseError,
  mapStorageError,
  MAX_IMAGE_MB,
  validateImageFile,
} from '@/lib/upload-validation'

function fileWith(overrides: { type?: string; size?: number; name?: string }): File {
  const file = new File(['x'], overrides.name ?? 'photo.jpg', {
    type: overrides.type ?? 'image/jpeg',
  })
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size })
  }
  return file
}

describe('validateImageFile', () => {
  it('accepts JPEG, PNG and WebP under the size limit', () => {
    expect(validateImageFile(fileWith({ type: 'image/jpeg' }))).toBeNull()
    expect(validateImageFile(fileWith({ type: 'image/png', name: 'photo.png' }))).toBeNull()
    expect(validateImageFile(fileWith({ type: 'image/webp', name: 'photo.webp' }))).toBeNull()
  })

  it('rejects unsupported types', () => {
    expect(validateImageFile(fileWith({ type: 'image/gif', name: 'photo.gif' }))).toBe(
      'Please upload a JPEG, PNG or WebP image.'
    )
  })

  it('rejects files over the size limit', () => {
    expect(
      validateImageFile(
        fileWith({ size: MAX_IMAGE_MB * 1024 * 1024 + 1 })
      )
    ).toBe(`Image must be under ${MAX_IMAGE_MB}MB.`)
  })
})

describe('mapStorageError', () => {
  it('maps known storage messages to user-facing copy', () => {
    expect(mapStorageError('maximum size exceeded')).toBe('File is too large.')
    expect(mapStorageError('invalid mime type')).toBe('Unsupported file type.')
    expect(mapStorageError('row-level security policy')).toBe(
      'Upload failed. Please try again.'
    )
  })
})

describe('mapDatabaseError', () => {
  it('returns a generic save failure message', () => {
    expect(mapDatabaseError()).toBe('Could not save your result. Please try again.')
  })
})
