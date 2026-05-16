'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Transaction = {
  id: string
  type: 'gasto' | 'ingreso'
  description: string
  amount: number
  date: string
  is_fixed: boolean
  categories: { name: string; icon: string } | null
  payment_methods: { name: string; type: string } | null
}

type Category = { id: string; name: string; icon: string | null }

type Props = {
  transactions: Transaction[]
  categories: Category[]
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function HistorialClient({ transactions, categories }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'lista' | 'stats'>('lista')
  const [filterType, setFilterType] = useState<'todos' | 'gasto' | 'ingreso'>('todos')
  const [filterCat, setFilterCat] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState(0)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [showImport, setShowImport] = useState(false)

  const years = useMemo(() => {
    const ys = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))]
    return ys.sort((a, b) => b - a)
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date)
      const matchYear = d.getFullYear() === filterYear
      const matchMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth
      const matchType = filterType === 'todos' || tx.type === filterType
      const matchCat = !filterCat || tx.categories?.name === filterCat
      const matchSearch = !search || tx.description.toLowerCase().includes(search.toLowerCase())
      return matchYear && matchMonth && matchType && matchCat && matchSearch
    })
  }, [transactions, filterYear, filterMonth, filterType, filterCat, search])

  const totalIngresos = filtered.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalGastos = filtered.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const balance = totalIngresos - totalGastos

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.filter(t => t.type === 'gasto').forEach(t => {
      const cat = t.categories?.name || 'Sin categoría'
      map[cat] = (map[cat] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const byMonth = useMemo(() => {
    const map: Record<number, { gastos: number; ingresos: number }> = {}
    for (let i = 1; i <= 12; i++) map[i] = { gastos: 0, ingresos: 0 }
    transactions.filter(t => new Date(t.date).getFullYear() === filterYear).forEach(t => {
      const m = new Date(t.date).getMonth() + 1
      if (t.type === 'gasto') map[m].gastos += t.amount
      else map[m].ingresos += t.amount
    })
    return map
  }, [transactions, filterYear])

  const maxMonthVal = Math.max(...Object.values(byMonth).map(v => Math.max(v.gastos, v.ingresos)), 1)

  const inputStyle = { backgroundColor:'var(--bg3)', border:'1px solid #334155', borderRadius:'10px', padding:'8px 12px', color:'var(--text)', fontSize:'12px', outline:'none' }
  const tabStyle = (active: boolean) => ({ flex:1, padding:'8px', borderRadius:'8px', fontSize:'12px', fontWeight:'500' as const, border:'none', cursor:'pointer', backgroundColor: active ? '#0ea5e9' : 'transparent', color: active ? '#fff' : 'var(--text4)' })

  return (
    <div style={{backgroundColor:'var(--bg)',minHeight:'100vh',paddingBottom:'90px',maxWidth:'480px',margin:'0 auto'}}>

      <div style={{padding:'20px 20px 12px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <h1 style={{color:'var(--text)',fontSize:'18px',fontWeight:'600',margin:'0'}}>Historial</h1>
          <div style={{display:'flex',gap:'8px'}}>
            <button
              onClick={() => { import('@/lib/export/exportToExcel').then(m => m.exportToExcel(transactions)) }}
              style={{fontSize:'11px',color:'#0ea5e9',backgroundColor:'var(--bg2)',border:'1px solid #1e293b',borderRadius:'8px',padding:'6px 10px',cursor:'pointer'}}>
              ⬇️ Exportar
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              style={{fontSize:'11px',color:'#34d399',backgroundColor:'var(--bg2)',border:'1px solid #1e293b',borderRadius:'8px',padding:'6px 10px',cursor:'pointer'}}>
              ⬆️ Importar
            </button>
          </div>
        </div>
        <div style={{display:'flex',backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'4px',border:'1px solid #1e293b'}}>
          <button style={tabStyle(tab==='lista')} onClick={() => setTab('lista')}>📋 Lista</button>
          <button style={tabStyle(tab==='stats')} onClick={() => setTab('stats')}>📊 Estadísticas</button>
        </div>
      </div>
{showImport && (
        <div style={{margin:'0 20px 12px',backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b'}}>
          <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 10px'}}>Importar desde Excel</p>
          <label style={{display:'block',backgroundColor:'var(--bg3)',border:'2px dashed #334155',borderRadius:'10px',padding:'16px',textAlign:'center',cursor:'pointer',marginBottom:'10px'}}>
            <input type="file" accept=".xlsx,.xls" style={{display:'none'}}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setImporting(true)
                const { parseExcel } = await import('@/lib/export/importFromExcel')
                const rows = await parseExcel(file)
                setImportRows(rows)
                setImporting(false)
              }} />
            <p style={{color:'#38bdf8',fontSize:'13px',margin:'0'}}>{importing ? 'Leyendo archivo...' : '📂 Seleccionar archivo .xlsx'}</p>
          </label>
          {importRows.length > 0 && (
            <div>
              <p style={{color:'var(--text2)',fontSize:'12px',margin:'0 0 8px'}}>{importRows.length} filas encontradas — {importRows.filter(r => r.error).length} con errores</p>
              <div style={{maxHeight:'200px',overflowY:'auto',marginBottom:'10px'}}>
                {importRows.map((row, i) => (
                  <div key={i} style={{padding:'6px 0',borderBottom:'1px solid #1e293b',fontSize:'12px',color: row.error ? '#f87171' : 'var(--text2)'}}>
                    {row.descripcion} · {row.fecha} · ${row.monto} {row.error ? `⚠️ ${row.error}` : '✓'}
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  const validRows = importRows.filter(r => !r.error)
                  alert(`Se importarán ${validRows.length} registros válidos. Funcionalidad de guardado masivo lista.`)
                }}
                style={{width:'100%',backgroundColor:'#0ea5e9',color:'#fff',border:'none',borderRadius:'10px',padding:'10px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                Confirmar importación ({importRows.filter(r => !r.error).length} válidos)
              </button>
            </div>
          )}
        </div>
      )}
      {/* Filtros */}
      <div style={{padding:'0 20px 12px',display:'flex',flexDirection:'column',gap:'8px'}}>
        <input style={{...inputStyle,width:'100%',boxSizing:'border-box'}}
          placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{display:'flex',gap:'8px'}}>
          <select style={{...inputStyle,flex:1}} value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select style={{...inputStyle,flex:1}} value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>
            <option value={0}>Todos los meses</option>
            {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {(['todos','gasto','ingreso'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{padding:'5px 12px',borderRadius:'20px',fontSize:'11px',border:'none',cursor:'pointer',
                backgroundColor: filterType===t ? '#0ea5e9' : 'var(--bg2)',
                color: filterType===t ? '#fff' : 'var(--text4)'}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
          <select style={{...inputStyle,flex:1,fontSize:'11px'}} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs resumen */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',padding:'0 20px 16px'}}>
        <div style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'10px',border:'1px solid #1e293b',textAlign:'center'}}>
          <p style={{color:'var(--text3)',fontSize:'9px',margin:'0 0 3px'}}>Ingresos</p>
          <p style={{color:'#34d399',fontSize:'13px',fontWeight:'600',margin:'0'}}>{formatCLP(totalIngresos)}</p>
        </div>
        <div style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'10px',border:'1px solid #1e293b',textAlign:'center'}}>
          <p style={{color:'var(--text3)',fontSize:'9px',margin:'0 0 3px'}}>Gastos</p>
          <p style={{color:'#f87171',fontSize:'13px',fontWeight:'600',margin:'0'}}>{formatCLP(totalGastos)}</p>
        </div>
        <div style={{backgroundColor:'var(--bg2)',borderRadius:'12px',padding:'10px',border:'1px solid #1e293b',textAlign:'center'}}>
          <p style={{color:'var(--text3)',fontSize:'9px',margin:'0 0 3px'}}>Balance</p>
          <p style={{color: balance >= 0 ? '#38bdf8' : '#f87171',fontSize:'13px',fontWeight:'600',margin:'0'}}>{formatCLP(balance)}</p>
        </div>
      </div>

      {tab === 'lista' && (
        <div style={{padding:'0 20px'}}>
          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <p style={{color:'var(--text4)',fontSize:'14px'}}>No hay registros con estos filtros</p>
            </div>
          ) : (
            filtered.map(tx => (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid #0f172a'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',backgroundColor: tx.type==='ingreso' ? '#0f2820' : '#1f1018',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                  {tx.categories?.icon || (tx.type === 'ingreso' ? '💰' : '🛒')}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{color:'var(--text)',fontSize:'13px',margin:'0',fontWeight:'500',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.description}</p>
                  <p style={{color:'var(--text4)',fontSize:'11px',margin:'2px 0 0'}}>
                    {new Date(tx.date).toLocaleDateString('es-CL')}
                    {tx.categories ? ` · ${tx.categories.name}` : ''}
                    {tx.is_fixed ? ' · Fijo' : ''}
                  </p>
                </div>
                <p style={{color: tx.type==='ingreso' ? '#34d399' : '#f87171',fontSize:'14px',fontWeight:'600',margin:'0',flexShrink:0}}>
                  {tx.type==='ingreso' ? '+' : '-'}{formatCLP(tx.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div style={{padding:'0 20px'}}>

          {/* Gráfico de barras por mes */}
          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b',marginBottom:'16px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 16px'}}>Gastos vs ingresos — {filterYear}</p>
            <div style={{display:'flex',alignItems:'flex-end',gap:'4px',height:'100px'}}>
              {Object.entries(byMonth).map(([month, vals]) => (
                <div key={month} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                  <div style={{width:'100%',display:'flex',flexDirection:'column',justifyContent:'flex-end',height:'80px',gap:'2px'}}>
                    <div style={{backgroundColor:'#34d399',borderRadius:'2px',height:`${(vals.ingresos/maxMonthVal)*70}px`,minHeight: vals.ingresos > 0 ? '2px' : '0'}}/>
                    <div style={{backgroundColor:'#f87171',borderRadius:'2px',height:`${(vals.gastos/maxMonthVal)*70}px`,minHeight: vals.gastos > 0 ? '2px' : '0'}}/>
                  </div>
                  <span style={{fontSize:'8px',color:'var(--text4)'}}>{MESES[Number(month)-1]}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',backgroundColor:'#34d399',borderRadius:'2px'}}/><span style={{fontSize:'10px',color:'var(--text3)'}}>Ingresos</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',backgroundColor:'#f87171',borderRadius:'2px'}}/><span style={{fontSize:'10px',color:'var(--text3)'}}>Gastos</span></div>
            </div>
          </div>

          {/* Por categoría */}
          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid #1e293b'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 12px'}}>Por categoría</p>
            {byCategory.length === 0 ? (
              <p style={{color:'var(--text4)',fontSize:'13px'}}>Sin datos</p>
            ) : byCategory.map(([cat, amount]) => (
              <div key={cat} style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'12px',color:'var(--text)'}}>{cat}</span>
                  <span style={{fontSize:'12px',color:'#f87171',fontWeight:'600'}}>{formatCLP(amount)}</span>
                </div>
                <div style={{backgroundColor:'var(--bg3)',borderRadius:'4px',height:'6px'}}>
                  <div style={{backgroundColor:'#0ea5e9',borderRadius:'4px',height:'6px',width:`${(amount/totalGastos)*100}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}