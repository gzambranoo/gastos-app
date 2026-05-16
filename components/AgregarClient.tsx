'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = {
  id: string
  name: string
  icon: string | null
  subcategories: { id: string; name: string }[]
}

type PaymentMethod = {
  id: string
  name: string
  type: string
  banks: { name: string } | null
}

type Props = {
  userId: string
  categories: Category[]
  paymentMethods: PaymentMethod[]
}

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function AgregarClient({ userId, categories, paymentMethods }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [isFixed, setIsFixed] = useState(false)
  const [hasInstallments, setHasInstallments] = useState(false)
  const [installmentsTotal, setInstallmentsTotal] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const selectedCategory = categories.find(c => c.id === categoryId)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setAnalyzing(true)
    setMessage('Analizando imagen con IA...')

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/analyze-receipt', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.description) setDescription(data.description)
      if (data.amount) setAmount(String(data.amount))
      if (data.type) setType(data.type)
      if (data.date) setDate(data.date)
      setMessage('✓ Imagen analizada. Revisa y ajusta los datos.')
    } catch {
      setMessage('No se pudo analizar la imagen. Ingresa los datos manualmente.')
    }
    setAnalyzing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount || !date) {
      setMessage('Completa descripción, monto y fecha.')
      return
    }
    setLoading(true)
    setMessage('')

    let receiptUrl = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, imageFile)
      if (!uploadError) receiptUrl = path
    }

    const txData = {
      user_id: userId,
      type,
      description,
      amount: parseFloat(amount.replace(/\./g, '').replace(',', '.')),
      date,
      category_id: categoryId || null,
      subcategory_id: subcategoryId || null,
      payment_method_id: paymentMethodId || null,
      is_fixed: isFixed,
      notes: notes || null,
      receipt_url: receiptUrl,
      installments_total: hasInstallments ? parseInt(installmentsTotal) : null,
      installment_amount: hasInstallments ? parseFloat(installmentAmount) : null,
    }

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert(txData)
      .select()
      .single()

    if (error) {
      setMessage('Error al guardar. Intenta de nuevo.')
      setLoading(false)
      return
    }

    if (hasInstallments && tx && paymentMethodId) {
      const nextDue = new Date()
      nextDue.setMonth(nextDue.getMonth() + 1)
      await supabase.from('debts').insert({
        user_id: userId,
        transaction_id: tx.id,
        description,
        total_amount: parseFloat(amount.replace(/\./g, '')),
        installment_amount: parseFloat(installmentAmount),
        installments_total: parseInt(installmentsTotal),
        installments_paid: 0,
        payment_method_id: paymentMethodId,
        category_id: categoryId || null,
        next_due_date: nextDue.toISOString().split('T')[0],
      })
    }

    setMessage('✓ Guardado correctamente')
    setTimeout(() => router.push('/'), 1200)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '11px 14px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  }

  return (
    <div style={{backgroundColor:'#020617',minHeight:'100vh',paddingBottom:'90px',maxWidth:'480px',margin:'0 auto'}}>

      {/* Header */}
      <div style={{padding:'20px 20px 12px',display:'flex',alignItems:'center',gap:'12px'}}>
        <button onClick={() => router.back()}
          style={{background:'none',border:'none',color:'#64748b',fontSize:'20px',cursor:'pointer',padding:'0'}}>
          ←
        </button>
        <h1 style={{color:'#ffffff',fontSize:'18px',fontWeight:'600',margin:'0'}}>Nuevo registro</h1>
      </div>

      {/* Toggle gasto / ingreso */}
      <div style={{display:'flex',backgroundColor:'#0f172a',margin:'0 20px 16px',borderRadius:'14px',padding:'4px',border:'1px solid #1e293b'}}>
        <button onClick={() => setType('gasto')}
          style={{flex:1,padding:'10px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',border:'none',cursor:'pointer',
            backgroundColor: type==='gasto' ? '#dc2626' : 'transparent',
            color: type==='gasto' ? '#ffffff' : '#475569'}}>
          🔴 Gasto
        </button>
        <button onClick={() => setType('ingreso')}
          style={{flex:1,padding:'10px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',border:'none',cursor:'pointer',
            backgroundColor: type==='ingreso' ? '#16a34a' : 'transparent',
            color: type==='ingreso' ? '#ffffff' : '#475569'}}>
          🟢 Ingreso
        </button>
      </div>

      {/* Zona de imagen */}
      <div style={{margin:'0 20px 16px'}}>
        <label style={{display:'block',backgroundColor:'#0f172a',border:'2px dashed #1e293b',borderRadius:'14px',padding:'20px',textAlign:'center',cursor:'pointer'}}>
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:'none'}} />
          <div style={{fontSize:'28px',marginBottom:'6px'}}>📷</div>
          <p style={{color:'#38bdf8',fontSize:'13px',margin:'0',fontWeight:'500'}}>
            {analyzing ? 'Analizando...' : imageFile ? imageFile.name : 'Escanear boleta o correo'}
          </p>
          <p style={{color:'#475569',fontSize:'11px',margin:'4px 0 0'}}>IA detectará categoría y monto</p>
        </label>
      </div>

      {message && (
        <div style={{margin:'0 20px 12px',backgroundColor:'#0f172a',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',color: message.startsWith('✓') ? '#34d399' : '#38bdf8',border:'1px solid #1e293b'}}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{padding:'0 20px'}}>

        <div style={{marginBottom:'14px'}}>
          <label style={labelStyle}>Descripción</label>
          <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ej: Supermercado Lider" required />
        </div>

        <div style={{marginBottom:'14px'}}>
          <label style={labelStyle}>Monto ($)</label>
          <input style={{...inputStyle,fontSize:'22px',fontWeight:'600'}}
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0" type="number" required />
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId('') }}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Subcategoría</label>
            <select style={inputStyle} value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} disabled={!categoryId}>
              <option value="">Ninguna</option>
              {selectedCategory?.subcategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
          <div>
            <label style={labelStyle}>Medio de pago</label>
            <select style={inputStyle} value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
              <option value="">Sin especificar</option>
              {paymentMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {/* Cuotas */}
        <div style={{backgroundColor:'#0f172a',borderRadius:'14px',padding:'14px',marginBottom:'14px',border:'1px solid #1e293b'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: hasInstallments ? '12px' : '0'}}>
            <span style={{fontSize:'13px',color:'#94a3b8'}}>💳 Pagar en cuotas</span>
            <div onClick={() => setHasInstallments(!hasInstallments)}
              style={{width:'40px',height:'22px',borderRadius:'11px',backgroundColor: hasInstallments ? '#0ea5e9' : '#1e293b',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
              <div style={{width:'18px',height:'18px',borderRadius:'50%',backgroundColor:'#fff',position:'absolute',top:'2px',left: hasInstallments ? '20px' : '2px',transition:'left 0.2s'}}/>
            </div>
          </div>
          {hasInstallments && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div>
                <label style={labelStyle}>N° cuotas</label>
                <input style={inputStyle} type="number" value={installmentsTotal}
                  onChange={e => setInstallmentsTotal(e.target.value)} placeholder="12" />
              </div>
              <div>
                <label style={labelStyle}>Monto cuota</label>
                <input style={inputStyle} type="number" value={installmentAmount}
                  onChange={e => setInstallmentAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
        </div>

        {/* Gasto fijo */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px',backgroundColor:'#0f172a',borderRadius:'12px',padding:'12px 14px',border:'1px solid #1e293b'}}>
          <input type="checkbox" id="fixed" checked={isFixed} onChange={e => setIsFixed(e.target.checked)}
            style={{width:'18px',height:'18px',accentColor:'#0ea5e9',cursor:'pointer'}} />
          <label htmlFor="fixed" style={{fontSize:'13px',color:'#94a3b8',cursor:'pointer'}}>
            Marcar como gasto/ingreso fijo o recurrente
          </label>
        </div>

        {/* Observaciones */}
        <div style={{marginBottom:'20px'}}>
          <label style={labelStyle}>Observaciones (opcional)</label>
          <textarea style={{...inputStyle,resize:'none',height:'72px'}}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notas adicionales..." />
        </div>

        <button type="submit" disabled={loading}
          style={{width:'100%',backgroundColor: type==='gasto' ? '#dc2626' : '#16a34a',color:'#fff',border:'none',borderRadius:'14px',padding:'14px',fontSize:'15px',fontWeight:'600',cursor:'pointer',opacity: loading ? 0.6 : 1}}>
          {loading ? 'Guardando...' : `Guardar ${type}`}
        </button>

      </form>
    </div>
  )
}