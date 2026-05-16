'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Debt = {
  id: string
  description: string
  total_amount: number
  installment_amount: number
  installments_total: number
  installments_paid: number
  next_due_date: string | null
  categories: { name: string; icon: string } | null
  payment_methods: { name: string; type: string; banks: { name: string } | null } | null
}

type Category = { id: string; name: string; icon: string | null }

type Props = {
  debts: Debt[]
  categories: Category[]
  userId: string
}

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function DeudasClient({ debts: initialDebts, categories, userId }: Props) {
  const supabase = createClient()
  const [debts, setDebts] = useState(initialDebts)
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todas' | 'activas' | 'pagadas'>('activas')
  const [message, setMessage] = useState('')

  const filtered = useMemo(() => {
    return debts.filter(d => {
      const isPaid = d.installments_paid >= d.installments_total
      const matchStatus = filterStatus === 'todas' || (filterStatus === 'activas' ? !isPaid : isPaid)
      const matchCat = !filterCat || d.categories?.name === filterCat
      return matchStatus && matchCat
    })
  }, [debts, filterStatus, filterCat])

  const totalDeuda = filtered
    .filter(d => d.installments_paid < d.installments_total)
    .reduce((s, d) => s + (d.installment_amount * (d.installments_total - d.installments_paid)), 0)

  const totalMensual = filtered
    .filter(d => d.installments_paid < d.installments_total)
    .reduce((s, d) => s + d.installment_amount, 0)

  async function markPaid(debt: Debt) {
    const newPaid = debt.installments_paid + 1
    const nextDue = debt.next_due_date
      ? new Date(new Date(debt.next_due_date).setMonth(new Date(debt.next_due_date).getMonth() + 1)).toISOString().split('T')[0]
      : null

    const { error } = await supabase
      .from('debts')
      .update({ installments_paid: newPaid, next_due_date: nextDue })
      .eq('id', debt.id)

    if (!error) {
      setDebts(debts.map(d => d.id === debt.id ? { ...d, installments_paid: newPaid, next_due_date: nextDue } : d))
      setMessage('✓ Cuota marcada como pagada')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const inputStyle = { backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:'10px', padding:'8px 12px', color:'#ffffff', fontSize:'12px', outline:'none' }

  return (
    <div style={{backgroundColor:'#020617',minHeight:'100vh',paddingBottom:'90px',maxWidth:'480px',margin:'0 auto'}}>

      <div style={{padding:'20px 20px 12px'}}>
        <h1 style={{color:'#ffffff',fontSize:'18px',fontWeight:'600',margin:'0 0 16px'}}>Deudas y cuotas</h1>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
          <div style={{backgroundColor:'#0f172a',borderRadius:'14px',padding:'14px',border:'1px solid #1e293b'}}>
            <p style={{color:'#64748b',fontSize:'10px',margin:'0 0 4px'}}>Total deuda restante</p>
            <p style={{color:'#f87171',fontSize:'18px',fontWeight:'700',margin:'0'}}>{formatCLP(totalDeuda)}</p>
          </div>
          <div style={{backgroundColor:'#0f172a',borderRadius:'14px',padding:'14px',border:'1px solid #1e293b'}}>
            <p style={{color:'#64748b',fontSize:'10px',margin:'0 0 4px'}}>Pago mensual total</p>
            <p style={{color:'#fbbf24',fontSize:'18px',fontWeight:'700',margin:'0'}}>{formatCLP(totalMensual)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
          {(['activas','todas','pagadas'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{padding:'5px 12px',borderRadius:'20px',fontSize:'11px',border:'none',cursor:'pointer',
                backgroundColor: filterStatus===s ? '#0ea5e9' : '#0f172a',
                color: filterStatus===s ? '#fff' : '#475569'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <select style={{...inputStyle,width:'100%',boxSizing:'border-box' as const,marginBottom:'12px'}}
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {message && (
        <div style={{margin:'0 20px 12px',backgroundColor:'#0f172a',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',color:'#34d399',border:'1px solid #1e293b'}}>
          {message}
        </div>
      )}

      <div style={{padding:'0 20px'}}>
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <p style={{fontSize:'32px',margin:'0 0 12px'}}>🎉</p>
            <p style={{color:'#475569',fontSize:'14px'}}>No hay deudas en este filtro</p>
          </div>
        ) : (
          filtered.map(debt => {
            const isPaid = debt.installments_paid >= debt.installments_total
            const progress = (debt.installments_paid / debt.installments_total) * 100
            const remaining = debt.installments_total - debt.installments_paid
            const days = daysUntil(debt.next_due_date)
            const isUrgent = days !== null && days <= 5 && !isPaid

            return (
              <div key={debt.id} style={{backgroundColor:'#0f172a',borderRadius:'16px',padding:'16px',border:`1px solid ${isUrgent ? '#ef4444' : '#1e293b'}`,marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                  <div style={{flex:1}}>
                    <p style={{color:'#e2e8f0',fontSize:'14px',fontWeight:'600',margin:'0 0 3px'}}>
                      {debt.categories?.icon || '💳'} {debt.description}
                    </p>
                    <p style={{color:'#475569',fontSize:'11px',margin:'0'}}>
                      {debt.payment_methods?.name || 'Sin medio'}
                      {debt.payment_methods?.banks ? ` · ${debt.payment_methods.banks.name}` : ''}
                    </p>
                  </div>
                  {isPaid ? (
                    <span style={{fontSize:'11px',color:'#34d399',backgroundColor:'rgba(52,211,153,0.1)',padding:'3px 8px',borderRadius:'8px'}}>Pagada</span>
                  ) : isUrgent ? (
                    <span style={{fontSize:'11px',color:'#f87171',backgroundColor:'rgba(239,68,68,0.1)',padding:'3px 8px',borderRadius:'8px'}}>Vence en {days}d</span>
                  ) : (
                    <span style={{fontSize:'11px',color:'#fbbf24',backgroundColor:'rgba(251,191,36,0.1)',padding:'3px 8px',borderRadius:'8px'}}>{remaining} cuotas</span>
                  )}
                </div>

                <div style={{backgroundColor:'#1e293b',borderRadius:'4px',height:'6px',marginBottom:'8px'}}>
                  <div style={{backgroundColor: isPaid ? '#34d399' : '#0ea5e9',borderRadius:'4px',height:'6px',width:`${progress}%`,transition:'width 0.3s'}}/>
                </div>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{color:'#94a3b8',fontSize:'11px',margin:'0'}}>{formatCLP(debt.installment_amount)}/mes</p>
                    <p style={{color:'#475569',fontSize:'10px',margin:'2px 0 0'}}>{debt.installments_paid}/{debt.installments_total} cuotas · Total {formatCLP(debt.total_amount)}</p>
                  </div>
                  {!isPaid && (
                    <button onClick={() => markPaid(debt)}
                      style={{backgroundColor:'#0ea5e9',color:'#fff',border:'none',borderRadius:'10px',padding:'7px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
                      ✓ Pagar cuota
                    </button>
                  )}
                </div>

                {debt.next_due_date && !isPaid && (
                  <p style={{color:'#475569',fontSize:'10px',margin:'8px 0 0'}}>
                    Próximo vencimiento: {new Date(debt.next_due_date).toLocaleDateString('es-CL')}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}