import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AgregarClient from '@/components/AgregarClient'

export default async function AgregarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('*, subcategories(*)')
    .eq('user_id', user.id)
    .order('name')

  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*, banks(*)')
    .eq('user_id', user.id)

  return (
    <AgregarClient
      userId={user.id}
      categories={categories || []}
      paymentMethods={paymentMethods || []}
    />
  )
}