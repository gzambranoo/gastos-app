'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  subcategories: { id: string; name: string }[]
}

type Bank = { id: string; name: string }

type PaymentMethod = {
  id: string
  name: string
  type: string
  last_four: string | null
  banks: { name: string } | null
}

type Budget = {
  id: string
  period: 'semanal' | 'mensual' | 'anual'
  amount: number
  year: number
}

type Props = {
  userId: string
  categories: Category[]
  banks: Bank[]
  paymentMethods: PaymentMethod[]
  budgets: Budget[]
  currentYear: number
}

const ICONS = [
  '🛒','🍔','🚗','💊','⚡','🎬','👕','📚','🏠','✈️',
  '🐾','💰','🎮','🍕','☕','🏋️','💄','🔧','📱','🎁',
  '🏦','💳','🍺','🎵','⚽','🏀','🎯','🧴','🐶','🐱',
  '🌿','🧠','💼','🎓','🏥','🚌','🛵','⛽','🧹','🍷',
  '🎂','🛏️','🪴','🧺','🔑','💡','🖥️','🎒','🧳','🌊'
]
const PAYMENT_TYPES = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' },
]

export default function ConfiguracionClient({ userId, categories, banks, paymentMethods, budgets, currentYear }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'presupuesto' | 'categorias' | 'bancos' | 'medios'>('presupuesto')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [cats, setCats] = useState(categories)
  const [bnks, setBnks] = useState(banks)
  const [methods, setMethods] = useState(paymentMethods)

  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('🛒')
  const [newSubName, setNewSubName] = useState('')
  const [selectedCatId, setSelectedCatId] = useState('')

  const [newBankName, setNewBankName] = useState('')

  const [newMethodName, setNewMethodName] = useState('')
  const [newMethodType, setNewMethodType] = useState('debito')
  const [newMethodBank, setNewMethodBank] = useState('')
  const [newMethodLast4, setNewMethodLast4] = useState('')

  const [budgetSemanal, setBudgetSemanal] = useState(budgets.find(b => b.period === 'semanal')?.amount?.toString() || '')
  const [budgetMensual, setBudgetMensual] = useState(budgets.find(b => b.period === 'mensual')?.amount?.toString() || '')
  const [budgetAnual, setBudgetAnual] = useState(budgets.find(b => b.period === 'anual')?.amount?.toString() || '')

  const [darkMode, setDarkMode] = useState(false)

 function toggleDark() {
  const html = document.documentElement
  const isCurrentlyDark = html.classList.contains('dark')
  if (isCurrentlyDark) {
    html.classList.remove('dark')
    html.classList.add('light')
    html.style.backgroundColor = '#f8fafc'
    localStorage.setItem('theme', 'light')
    setDarkMode(false)
  } else {
    html.classList.remove('light')
    html.classList.add('dark')
    html.style.backgroundColor = 'var(--bg)'
    localStorage.setItem('theme', 'dark')
    setDarkMode(true)
  }
}

  async function saveBudget(period: 'semanal' | 'mensual' | 'anual', amount: string) {
    if (!amount) return
    setLoading(true)
    const existing = budgets.find(b => b.period === period)
    if (existing) {
      await supabase.from('budgets').update({ amount: parseFloat(amount) }).eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({ user_id: userId, period, amount: parseFloat(amount), year: currentYear })
    }
    setMessage(`✓ Presupuesto ${period} guardado`)
    setLoading(false)
  }

  async function addCategory() {
    if (!newCatName) return
    setLoading(true)
    const { data } = await supabase.from('categories')
      .insert({ user_id: userId, name: newCatName, icon: newCatIcon })
      .select('*, subcategories(*)')
      .single()
    if (data) setCats([...cats, data])
    setNewCatName('')
    setMessage('✓ Categoría agregada')
    setLoading(false)
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCats(cats.filter(c => c.id !== id))
  }

  async function addSubcategory() {
    if (!newSubName || !selectedCatId) return
    setLoading(true)
    const { data } = await supabase.from('subcategories')
      .insert({ user_id: userId, category_id: selectedCatId, name: newSubName })
      .select().single()
    if (data) {
      setCats(cats.map(c => c.id === selectedCatId
        ? { ...c, subcategories: [...(c.subcategories || []), data] }
        : c))
    }
    setNewSubName('')
    setMessage('✓ Subcategoría agregada')
    setLoading(false)
  }

  async function addBank() {
    if (!newBankName) return
    setLoading(true)
    const { data } = await supabase.from('banks')
      .insert({ user_id: userId, name: newBankName })
      .select().single()
    if (data) setBnks([...bnks, data])
    setNewBankName('')
    setMessage('✓ Banco agregado')
    setLoading(false)
  }

  async function deleteBank(id: string) {
    await supabase.from('banks').delete().eq('id', id)
    setBnks(bnks.filter(b => b.id !== id))
  }

  async function addPaymentMethod() {
    if (!newMethodName) return
    setLoading(true)
    const { data } = await supabase.from('payment_methods')
      .insert({ user_id: userId, name: newMethodName, type: newMethodType, bank_id: newMethodBank || null, last_four: newMethodLast4 || null })
      .select('*, banks(*)').single()
    if (data) setMethods([...methods, data])
    setNewMethodName('')
    setNewMethodLast4('')
    setMessage('✓ Medio de pago agregado')
    setLoading(false)
  }

  async function deleteMethod(id: string) {
    await supabase.from('payment_methods').delete().eq('id', id)
    setMethods(methods.filter(m => m.id !== id))
  }

  const inputStyle = { width:'100%', backgroundColor:'var(--bg3)', border:'1px solid #334155', borderRadius:'10px', padding:'10px 14px', color:'var(--text)', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }
  const btnStyle = { backgroundColor:'#0ea5e9', color:'#fff', border:'none', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', fontWeight:'600' as const, cursor:'pointer', whiteSpace:'nowrap' as const }
  const tabStyle = (active: boolean) => ({ flex:1, padding:'8px', borderRadius:'8px', fontSize:'11px', fontWeight:'500' as const, border:'none', cursor:'pointer', backgroundColor: active ? '#0ea5e9' : 'transparent', color: active ? '#fff' : 'var(--text4)' })

  return (
    <div style={{backgroundColor:'var(--bg)',minHeight:'100vh',paddingBottom:'90px',maxWidth:'480px',margin:'0 auto'}}>
      <div style={{padding:'20px 20px 12px',display:'flex',alignItems:'center',gap:'12px'}}>
        <h1 style={{color:'var(--text)',fontSize:'18px',fontWeight:'600',margin:'0'}}>Configuración</h1>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'12px',color:'var(--text3)'}}>{darkMode ? '🌙' : '☀️'}</span>
          <div onClick={toggleDark} style={{width:'40px',height:'22px',borderRadius:'11px',backgroundColor: darkMode ? '#0ea5e9' : 'var(--text4)',position:'relative',cursor:'pointer'}}>
            <div style={{width:'18px',height:'18px',borderRadius:'50%',backgroundColor:'#fff',position:'absolute',top:'2px',left: darkMode ? '20px' : '2px',transition:'left 0.2s'}}/>
          </div>
        </div>
      </div>

      <div style={{display:'flex',backgroundColor:'var(--bg2)',margin:'0 20px 16px',borderRadius:'12px',padding:'4px',border:'1px solid #1e293b'}}>
        <button style={tabStyle(tab==='presupuesto')} onClick={() => setTab('presupuesto')}>💰 Presupuesto</button>
        <button style={tabStyle(tab==='categorias')} onClick={() => setTab('categorias')}>🏷️ Categorías</button>
        <button style={tabStyle(tab==='bancos')} onClick={() => setTab('bancos')}>🏦 Bancos</button>
        <button style={tabStyle(tab==='medios')} onClick={() => setTab('medios')}>💳 Medios</button>
      </div>

      {message && (
        <div style={{margin:'0 20px 12px',backgroundColor:'var(--bg2)',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',color:'#34d399',border:'1px solid #1e293b'}}>
          {message}
        </div>
      )}

      <div style={{padding:'0 20px'}}>

        {tab === 'presupuesto' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {([['semanal','Semanal',budgetSemanal,setBudgetSemanal],['mensual','Mensual',budgetMensual,setBudgetMensual],['anual','Anual',budgetAnual,setBudgetAnual]] as const).map(([period, label, val, setVal]) => (
              <div key={period} style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b'}}>
                <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 10px',fontWeight:'600'}}>{label}</p>
                <div style={{display:'flex',gap:'8px'}}>
                  <input style={inputStyle} type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="Monto en pesos" />
                  <button style={btnStyle} onClick={() => saveBudget(period, val)} disabled={loading}>Guardar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'categorias' && (
          <div>
            <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b',marginBottom:'12px'}}>
              <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 10px',fontWeight:'600'}}>Nueva categoría</p>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setNewCatIcon(icon)}
                    style={{fontSize:'20px',padding:'4px',background: newCatIcon===icon ? 'var(--bg3)' : 'none',border: newCatIcon===icon ? '1px solid #0ea5e9' : '1px solid transparent',borderRadius:'8px',cursor:'pointer'}}>
                    {icon}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const custom = prompt('Escribe o pega un emoji:')
                    if (custom) setNewCatIcon(custom.trim())
                  }}
                  style={{fontSize:'13px',padding:'4px 8px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'8px',cursor:'pointer',color:'var(--text2)',fontWeight:'600'}}>
                  + otro
                </button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <span style={{fontSize:'28px'}}>{newCatIcon}</span>
                <span style={{fontSize:'12px',color:'var(--text3)'}}>Ícono seleccionado</span>
              </div>
              <div style={{display:'flex',gap:'8px'}}>
                <input style={inputStyle} value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre categoría" />
                <button style={btnStyle} onClick={addCategory} disabled={loading}>+ Agregar</button>
              </div>
            </div>

            <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b',marginBottom:'12px'}}>
              <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 10px',fontWeight:'600'}}>Nueva subcategoría</p>
              <select style={{...inputStyle,marginBottom:'8px'}} value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
                <option value="">Selecciona categoría</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <div style={{display:'flex',gap:'8px'}}>
                <input style={inputStyle} value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Nombre subcategoría" />
                <button style={btnStyle} onClick={addSubcategory} disabled={loading}>+ Agregar</button>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {cats.map(cat => (
                <div key={cat.id} style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'12px 14px',border:'1px solid #1e293b'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{color:'var(--text)',fontSize:'14px'}}>{cat.icon} {cat.name}</span>
                    <button onClick={() => deleteCategory(cat.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>✕</button>
                  </div>
                  {cat.subcategories?.length > 0 && (
                    <div style={{marginTop:'6px',display:'flex',flexWrap:'wrap',gap:'4px'}}>
                      {cat.subcategories.map(s => (
                        <span key={s.id} style={{fontSize:'11px',color:'var(--text3)',backgroundColor:'var(--bg3)',padding:'2px 8px',borderRadius:'8px'}}>{s.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'bancos' && (
          <div>
            <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b',marginBottom:'12px'}}>
              <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 10px',fontWeight:'600'}}>Agregar banco</p>
              <div style={{display:'flex',gap:'8px'}}>
                <input style={inputStyle} value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Nombre del banco" />
                <button style={btnStyle} onClick={addBank} disabled={loading}>+ Agregar</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {bnks.map(bank => (
                <div key={bank.id} style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'12px 14px',border:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:'var(--text)',fontSize:'14px'}}>🏦 {bank.name}</span>
                  <button onClick={() => deleteBank(bank.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'medios' && (
          <div>
            <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b',marginBottom:'12px'}}>
              <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 10px',fontWeight:'600'}}>Agregar medio de pago</p>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <input style={inputStyle} value={newMethodName} onChange={e => setNewMethodName(e.target.value)} placeholder="Nombre (ej: Visa BCI)" />
                <select style={inputStyle} value={newMethodType} onChange={e => setNewMethodType(e.target.value)}>
                  {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select style={inputStyle} value={newMethodBank} onChange={e => setNewMethodBank(e.target.value)}>
                  <option value="">Sin banco asociado</option>
                  {bnks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input style={inputStyle} value={newMethodLast4} onChange={e => setNewMethodLast4(e.target.value)} placeholder="Últimos 4 dígitos (opcional)" maxLength={4} />
                <button style={{...btnStyle,width:'100%'}} onClick={addPaymentMethod} disabled={loading}>+ Agregar medio de pago</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {methods.map(m => (
                <div key={m.id} style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'12px 14px',border:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{color:'var(--text)',fontSize:'13px',margin:'0'}}>💳 {m.name}</p>
                    <p style={{color:'var(--text4)',fontSize:'11px',margin:'2px 0 0'}}>{m.type}{m.banks ? ` · ${m.banks.name}` : ''}{m.last_four ? ` · ****${m.last_four}` : ''}</p>
                  </div>
                  <button onClick={() => deleteMethod(m.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}