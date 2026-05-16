'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Transaction = {
  id: string
  type: 'gasto' | 'ingreso'
  description: string
  amount: number
  date: string
  is_fixed: boolean
  category_id: string | null
}

type Budget = {
  id: string
  period: 'semanal' | 'mensual' | 'anual'
  amount: number
  year: number
  month: number | null
}

type Debt = {
  id: string
  description: string
  total_amount: number
  installment_amount: number
  installments_total: number
  installments_paid: number
  next_due_date: string | null
}

type Props = {
  user: { email?: string }
  transactions: Transaction[]
  budgets: Budget[]
  debts: Debt[]
  currentMonth: number
  currentYear: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getWeekNumber(date: Date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function DashboardClient({ user, transactions, budgets, debts, currentMonth, currentYear }: Props) {
  const [period, setPeriod] = useState<'semanal' | 'mensual' | 'anual'>('mensual')
  const [viewMode, setViewMode] = useState<'saldo' | 'presupuesto'>('saldo')
  const [hideFixed, setHideFixed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const currentWeek = getWeekNumber(now)

  function filterByPeriod(txs: Transaction[]) {
    return txs.filter(tx => {
      const d = new Date(tx.date)
      if (period === 'semanal') return getWeekNumber(d) === currentWeek && d.getFullYear() === currentYear
      if (period === 'mensual') return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
      return d.getFullYear() === currentYear
    })
  }

  const filtered = filterByPeriod(transactions)
  const visible = hideFixed ? filtered.filter(tx => !tx.is_fixed) : filtered

  const totalIngresos = visible.filter(tx => tx.type === 'ingreso').reduce((s, tx) => s + tx.amount, 0)
  const totalGastos = visible.filter(tx => tx.type === 'gasto').reduce((s, tx) => s + tx.amount, 0)
  const saldoReal = totalIngresos - totalGastos

  const budget = budgets.find(b => b.period === period)
  const presupuesto = budget?.amount || 0
  const disponible = presupuesto - totalGastos
  const porcentajeUsado = presupuesto > 0 ? Math.min((totalGastos / presupuesto) * 100, 100) : 0

  const totalDeudas = debts.reduce((s, d) => s + (d.installment_amount * (d.installments_total - d.installments_paid)), 0)

  const periodLabel = period === 'semanal' ? `Semana ${currentWeek}` : period === 'mensual' ? MESES[currentMonth - 1] : `Año ${currentYear}`

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const recentTxs = [...transactions].slice(0, 5)

  return (
    <div style={{backgroundColor:'var(--bg)',minHeight:'100vh',paddingBottom:'80px',maxWidth:'480px',margin:'0 auto'}}>

      {/* Header */}
      <div style={{padding:'20px 20px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <p style={{color:'var(--text3)',fontSize:'13px',margin:'0'}}>Bienvenido</p>
          <p style={{color:'var(--text)',fontSize:'16px',fontWeight:'600',margin:'4px 0 0'}}>{user.email?.split('@')[0]}</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button
            onClick={handleLogout}
            style={{fontSize:'11px',color:'var(--text4)',background:'none',border:'1px solid #1e293b',borderRadius:'8px',padding:'5px 10px',cursor:'pointer'}}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <div style={{display:'flex',gap:'6px',padding:'0 20px 12px'}}>
        {(['semanal','mensual','anual'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{flex:1,padding:'7px 0',borderRadius:'20px',fontSize:'11px',fontWeight:'500',border:'none',cursor:'pointer',
              backgroundColor: period === p ? '#0ea5e9' : 'var(--bg2)',
              color: period === p ? 'var(--text)' : 'var(--text4)'}}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Tarjeta principal */}
      <div style={{margin:'0 20px 16px',backgroundColor:'var(--bg2)',borderRadius:'20px',padding:'20px',border:'1px solid #1e293b'}}>

        {/* Toggle saldo / presupuesto */}
        <div style={{display:'flex',backgroundColor:'var(--bg3)',borderRadius:'10px',padding:'3px',marginBottom:'16px'}}>
          <button onClick={() => setViewMode('saldo')}
            style={{flex:1,padding:'6px',borderRadius:'7px',fontSize:'11px',fontWeight:'500',border:'none',cursor:'pointer',
              backgroundColor: viewMode==='saldo' ? '#0369a1' : 'transparent',
              color: viewMode==='saldo' ? 'var(--text)' : 'var(--text4)'}}>
            💰 Saldo real
          </button>
          <button onClick={() => setViewMode('presupuesto')}
            style={{flex:1,padding:'6px',borderRadius:'7px',fontSize:'11px',fontWeight:'500',border:'none',cursor:'pointer',
              backgroundColor: viewMode==='presupuesto' ? '#0369a1' : 'transparent',
              color: viewMode==='presupuesto' ? 'var(--text)' : 'var(--text4)'}}>
            🎯 Presupuesto
          </button>
        </div>

        {viewMode === 'saldo' ? (
          <div>
            <p style={{color:'var(--text3)',fontSize:'12px',margin:'0 0 4px'}}>{periodLabel} — Saldo disponible</p>
            <p style={{color: saldoReal >= 0 ? '#34d399' : '#f87171',fontSize:'32px',fontWeight:'700',margin:'0 0 16px'}}>
              {formatCLP(saldoReal)}
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div style={{backgroundColor:'#0f2820',borderRadius:'12px',padding:'12px'}}>
                <p style={{color:'var(--text3)',fontSize:'10px',margin:'0 0 3px'}}>Ingresos</p>
                <p style={{color:'#34d399',fontSize:'16px',fontWeight:'600',margin:'0'}}>{formatCLP(totalIngresos)}</p>
              </div>
              <div style={{backgroundColor:'#1f1018',borderRadius:'12px',padding:'12px'}}>
                <p style={{color:'var(--text3)',fontSize:'10px',margin:'0 0 3px'}}>Gastos</p>
                <p style={{color:'#f87171',fontSize:'16px',fontWeight:'600',margin:'0'}}>{formatCLP(totalGastos)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{color:'var(--text3)',fontSize:'12px',margin:'0 0 4px'}}>{periodLabel} — Disponible del presupuesto</p>
            <p style={{color: disponible >= 0 ? '#38bdf8' : '#f87171',fontSize:'32px',fontWeight:'700',margin:'0 0 4px'}}>
              {formatCLP(disponible)}
            </p>
            <p style={{color:'var(--text4)',fontSize:'11px',margin:'0 0 12px'}}>
              Gastado {formatCLP(totalGastos)} de {formatCLP(presupuesto)}
            </p>
            <div style={{backgroundColor:'var(--bg3)',borderRadius:'6px',height:'8px',marginBottom:'6px'}}>
              <div style={{backgroundColor: porcentajeUsado > 90 ? '#f87171' : '#0ea5e9',borderRadius:'6px',height:'8px',width:`${porcentajeUsado}%`,transition:'width 0.3s'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:'10px',color:'var(--text4)'}}>{Math.round(porcentajeUsado)}% usado</span>
              {presupuesto === 0 && (
                <button onClick={() => router.push('/configuracion')}
                  style={{fontSize:'10px',color:'#0ea5e9',background:'none',border:'none',cursor:'pointer',padding:'0'}}>
                  + Configurar presupuesto
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',padding:'0 20px 16px'}}>
        <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'14px',border:'1px solid #1e293b'}}>
          <p style={{color:'var(--text3)',fontSize:'10px',margin:'0 0 4px'}}>Deudas activas</p>
          <p style={{color:'#fbbf24',fontSize:'18px',fontWeight:'600',margin:'0'}}>{formatCLP(totalDeudas)}</p>
          <p style={{color:'var(--text4)',fontSize:'9px',margin:'3px 0 0'}}>{debts.length} pendientes</p>
        </div>
        <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'14px',border:'1px solid #1e293b'}}>
          <p style={{color:'var(--text3)',fontSize:'10px',margin:'0 0 4px'}}>Transacciones</p>
          <p style={{color:'#a78bfa',fontSize:'18px',fontWeight:'600',margin:'0'}}>{visible.length}</p>
          <p style={{color:'var(--text4)',fontSize:'9px',margin:'3px 0 0'}}>{periodLabel}</p>
        </div>
      </div>

      {/* Toggle gastos fijos */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px 12px'}}>
        <span style={{fontSize:'12px',color:'var(--text3)'}}>Ocultar gastos fijos</span>
        <div onClick={() => setHideFixed(!hideFixed)}
          style={{width:'40px',height:'22px',borderRadius:'11px',backgroundColor: hideFixed ? '#0ea5e9' : 'var(--bg3)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
          <div style={{width:'18px',height:'18px',borderRadius:'50%',backgroundColor:'#fff',position:'absolute',top:'2px',left: hideFixed ? '20px' : '2px',transition:'left 0.2s'}}/>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div style={{padding:'0 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <p style={{color:'var(--text2)',fontSize:'12px',margin:'0',textTransform:'uppercase',letterSpacing:'0.5px'}}>Últimos movimientos</p>
          <button onClick={() => router.push('/historial')}
            style={{fontSize:'11px',color:'#0ea5e9',background:'none',border:'none',cursor:'pointer',padding:'0'}}>
            Ver todos
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <p style={{color:'var(--text4)',fontSize:'13px'}}>Aún no hay movimientos</p>
            <button onClick={() => router.push('/agregar')}
              style={{marginTop:'12px',backgroundColor:'#0ea5e9',color:'#fff',border:'none',borderRadius:'10px',padding:'10px 20px',fontSize:'13px',cursor:'pointer'}}>
              Agregar primer gasto
            </button>
          </div>
        ) : (
          recentTxs.map(tx => (
            <div key={tx.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid #0f172a'}}>
              <div style={{width:'38px',height:'38px',borderRadius:'12px',backgroundColor: tx.type === 'ingreso' ? '#0f2820' : '#1f1018',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                {tx.type === 'ingreso' ? '💰' : '🛒'}
              </div>
              <div style={{flex:1}}>
                <p style={{color:'var(--text)',fontSize:'13px',margin:'0',fontWeight:'500'}}>{tx.description}</p>
                <p style={{color:'var(--text4)',fontSize:'11px',margin:'2px 0 0'}}>{new Date(tx.date).toLocaleDateString('es-CL')}{tx.is_fixed ? ' · Fijo' : ''}</p>
              </div>
              <p style={{color: tx.type === 'ingreso' ? '#34d399' : '#f87171',fontSize:'14px',fontWeight:'600',margin:'0'}}>
                {tx.type === 'ingreso' ? '+' : '-'}{formatCLP(tx.amount)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* FAB agregar */}
      <button
        onClick={() => router.push('/agregar')}
        style={{position:'fixed',bottom:'76px',right:'20px',width:'52px',height:'52px',borderRadius:'50%',backgroundColor:'#0ea5e9',color:'#fff',fontSize:'26px',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(14,165,233,0.4)',zIndex:40}}>
        +
      </button>
    </div>
  )
}