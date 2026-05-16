import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DeudasClient from '@/components/DeudasClient'

export default async function DeudasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: debts } = await supabase
    .from('debts')
    .select('*, categories(name, icon), payment_methods(name, type, banks(name))')
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true })

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)

  return (
    <DeudasClient
      debts={debts || []}
      categories={categories || []}
      userId={user.id}
    />
  )
}