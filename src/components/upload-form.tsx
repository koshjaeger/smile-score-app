'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatSmileScore } from '@/lib/smile-score'
import type { Database } from '@/types/database.types'

type SmileResult = Database['public']['Tables']['smile_results']['Row']

/** Paths are stored as `{userId}/{timestamp}-{originalFilename}` */
function getDisplayFilename(imagePath: string): string {
  const basename = imagePath.split('/').pop() ?? imagePath
  return basename.replace(/^\d+-/, '') || basename
}

function formatResultTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Module-level flag: models load once per browser session, not per render
let modelsLoaded = false

async function detectSmileScore(imgElement: HTMLImageElement): Promise<number> {
  // Dynamic import: face-api uses browser APIs, can't run server-side
  const faceapi = await import('@vladmandic/face-api')

  if (!modelsLoaded) {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    ])
    modelsLoaded = true
  }

  const result = await faceapi
    .detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions()

  // Returns 0 if no face detected rather than throwing
  return result?.expressions.happy ?? 0
}

interface Props {
  initialResults: SmileResult[]
  userId: string
}

export default function UploadForm({ initialResults, userId }: Props) {
  const router = useRouter()
  const imgRef = useRef<HTMLImageElement>(null)

  const [results, setResults] = useState<SmileResult[]>(initialResults)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'analysing' | 'saving' | 'done' | 'error'
  >('idle')
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setStatus('idle')
    setLastScore(null)
    setErrorMsg(null)
  }

  async function handleAnalyse() {
    if (!file || !imgRef.current) return
    setErrorMsg(null)

    try {
      setStatus('analysing')
      // Wait for image to be fully decoded before passing to TensorFlow
        await new Promise<void>((resolve) => {
            if (imgRef.current!.complete && imgRef.current!.naturalWidth > 0) {
            resolve()
            } else {
            imgRef.current!.onload = () => resolve()
            }
        })
      const score = await detectSmileScore(imgRef.current)
      setLastScore(score)

      setStatus('saving')
      const supabase = createClient()

      // Store under user's own folder — enforced by storage RLS policy
      const filePath = `${userId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('smile-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: newResult, error: insertError } = await supabase
        .from('smile_results')
        .insert({
          user_id: userId,
          image_path: filePath,
          smile_score: score,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setResults(prev => [newResult, ...prev])
      setStatus('done')

      // Invalidates the Server Component cache so a full refresh is in sync
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const isLoading = status === 'analysing' || status === 'saving'

  return (
    <div className="space-y-6">
      <section className="card card-pad space-y-4">
        <div>
          <h2 className="heading-section">Upload a photo</h2>
          <p className="muted mt-1">
            Choose a clear face photo, then analyse your smile.
          </p>
        </div>

        <div className="card-section space-y-3">
          <div>
            <label htmlFor="smile-photo" className="label">
              Photo
            </label>
            <input
              id="smile-photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isLoading}
              className="input-file"
            />
          </div>

          {preview && (
            <div className="media-well">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={preview}
                alt="Selected photo preview"
                className="mx-auto max-h-64 w-full rounded-md object-contain"
              />
            </div>
          )}
        </div>

        {status === 'done' && lastScore !== null && (
          <div className="alert-success">
            {(() => {
              const { percentage, label } = formatSmileScore(lastScore)
              return `${label} — ${percentage}% smile score`
            })()}
          </div>
        )}

        {errorMsg && <p className="alert-error">{errorMsg}</p>}

        {file && (
          <button
            onClick={handleAnalyse}
            disabled={isLoading}
            className="btn-primary"
          >
            {status === 'analysing' && 'Analysing…'}
            {status === 'saving' && 'Saving…'}
            {!isLoading && 'Analyse smile'}
          </button>
        )}
      </section>

      {results.length > 0 && (
        <section className="card card-pad">
          <h2 className="heading-section mb-4">Past results</h2>
          <ul className="list-divider rounded-lg border border-border bg-surface-muted/40 px-3 sm:px-4">
            {results.map(result => {
              const { percentage, label } = formatSmileScore(
                Number(result.smile_score)
              )
              const filename = getDisplayFilename(result.image_path)
              return (
                <li
                  key={result.id}
                  className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-center gap-3 py-3"
                >
                  <div className="shrink-0">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="list-value">{percentage}%</span>
                  </div>
                  <p className="truncate-cell text-sm text-gray-600 dark:text-zinc-400" title={filename}>
                    {filename}
                  </p>
                  <time
                    className="list-meta shrink-0 whitespace-nowrap text-right"
                    dateTime={result.created_at ?? undefined}
                  >
                    {formatResultTimestamp(result.created_at)}
                  </time>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}