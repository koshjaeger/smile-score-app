'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="page-center">
      <div className="auth-shell">
        <div className="auth-brand">
          <p className="heading-page">Smile Score</p>
          <p className="muted mt-1">Measure and track your smile</p>
        </div>

        <div className="card card-pad">
          <h1 className="heading-section mb-1">Sign in</h1>
          <p className="muted mb-6">Welcome back. Sign in to check your smile score.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
              />
            </div>

            {error && <p className="alert-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="muted mt-6 border-t border-border pt-5">
            No account?{' '}
            <Link href="/register" className="link">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
