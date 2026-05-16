import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracionClient from '@/components/ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('*, subcategories(*)')
    .eq('user_id', user.id)
    .order('name')

  const { data: banks } = await supabase
    .from('banks')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*, banks(*)')
    .eq('user_id', user.id)

  const { data: budgets } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())

  return (
    <ConfiguracionClient
      userId={user.id}
      categories={categories || []}
      banks={banks || []}
      paymentMethods={paymentMethods || []}
      budgets={budgets || []}
      currentYear={new Date().getFullYear()}
    />
  )
}