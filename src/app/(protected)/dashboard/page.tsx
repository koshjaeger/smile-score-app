import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/upload-form'
import { connection } from 'next/server'

export default async function DashboardPage() {
  await connection() // Forces request-time rendering
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: results } = await supabase
    .from('smile_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="app-frame">
          <header className="app-header">
            <div>
              <h1 className="heading-page">Smile Score</h1>
              <p className="muted mt-1">
                Upload a photo and track your smile history.
              </p>
            </div>
            <form action={signOut}>
              <button type="submit" className="btn-secondary shrink-0">
                Sign out
              </button>
            </form>
          </header>

          <div className="app-body">
            <UploadForm initialResults={results ?? []} userId={user.id} />
          </div>
        </div>
      </div>
    </main>
  )
}
