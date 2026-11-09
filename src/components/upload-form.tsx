'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatSmileScore } from '@/lib/smile-score'
import type { Database } from '@/types/database.types'

type SmileResult = Database['public']['Tables']['smile_results']['Row']

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
      {/* Upload card */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Upload a photo</h2>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
          className="block w-full text-sm text-gray-600
            file:mr-4 file:py-2 file:px-4 file:rounded-lg
            file:border-0 file:bg-blue-50 file:text-blue-700
            file:font-medium hover:file:bg-blue-100"
        />

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={preview}
            alt="Selected photo preview"
            className="w-full max-h-64 object-contain rounded-lg border border-gray-100"
          />
        )}

        {status === 'done' && lastScore !== null && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            {(() => {
              const { percentage, label } = formatSmileScore(lastScore)
              return `${label} — ${percentage}% smile score`
            })()}
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        {file && (
          <button
            onClick={handleAnalyse}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg
              text-sm font-medium hover:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'analysing' && 'Analysing…'}
            {status === 'saving' && 'Saving…'}
            {!isLoading && 'Analyse smile'}
          </button>
        )}
      </div>

      {/* Results history */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Past results
          </h2>
          <ul className="divide-y divide-gray-100">
            {results.map(result => {
              const { percentage, label } = formatSmileScore(
                Number(result.smile_score)
              )
              return (
                <li
                  key={result.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <span className="font-medium text-gray-900">{label}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {percentage}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                  {result.created_at ? new Date(result.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    }) : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}