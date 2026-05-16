import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistorialClient from '@/components/HistorialClient'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, categories(name, icon), payment_methods(name, type)')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)

  return (
    <HistorialClient
      transactions={transactions || []}
      categories={categories || []}
    />
  )
}