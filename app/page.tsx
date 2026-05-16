import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', `${year}-01-01`)
    .order('date', { ascending: false })

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)

  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)

  return (
    <DashboardClient
      user={user}
      transactions={transactions || []}
      budgets={budgets || []}
      debts={debts || []}
      currentMonth={month}
      currentYear={year}
    />
  )
}