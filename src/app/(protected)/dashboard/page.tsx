import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UploadForm from '@/components/upload-form'
import { connection } from 'next/server'
// export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    await connection()  // Forces request-time rendering
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Smile Score</h1>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </form>
        </div>
        <UploadForm initialResults={results ?? []} userId={user.id} />
      </div>
    </main>
  )
}