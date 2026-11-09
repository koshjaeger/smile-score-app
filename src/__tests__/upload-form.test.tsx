import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Adjust if your component uses a named export instead
import UploadForm from '@/components/upload-form'

// ── Mock: next/navigation (useRouter needs App Router context) ─────────────
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  }))

// ── Global browser API stubs (not available in jsdom) ──────────────────────
global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = jest.fn()

// ── Mock: Supabase browser client ──────────────────────────────────────────
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id' } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'mock-user-id/test-image.jpg' },
          error: null,
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/mock-signed-url' },
          error: null,
        }),
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  })),
}))

// ── Mock: @vladmandic/face-api ─────────────────────────────────────────────
jest.mock('@vladmandic/face-api', () => ({
  nets: {
    tinyFaceDetector: {
      loadFromUri: jest.fn().mockResolvedValue(undefined),
    },
    faceExpressionNet: {
      loadFromUri: jest.fn().mockResolvedValue(undefined),
    },
  },
  detectSingleFace: jest.fn().mockReturnValue({
    withFaceExpressions: jest.fn().mockResolvedValue({
      expressions: { happy: 0.85 },
    }),
  }),
  TinyFaceDetectorOptions: jest.fn().mockImplementation(() => ({})),
}))

function selectImageFile() {
  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement
  fireEvent.change(fileInput, {
    target: {
      files: [new File(['x'], 'smile.jpg', { type: 'image/jpeg' })],
    },
  })
}

describe('UploadForm', () => {
  it('renders a file input and shows the analyse button after a file is selected', () => {
    render(<UploadForm initialResults={[]} userId="mock-user-id" />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /analyse smile/i })
    ).not.toBeInTheDocument()

    selectImageFile()

    expect(
      screen.getByRole('button', { name: /analyse smile/i })
    ).toBeInTheDocument()
  })

  it('does not show an analyse button when no file is selected', () => {
    render(<UploadForm initialResults={[]} userId="mock-user-id" />)

    expect(
      screen.queryByRole('button', { name: /analyse smile/i })
    ).not.toBeInTheDocument()
  })
})
