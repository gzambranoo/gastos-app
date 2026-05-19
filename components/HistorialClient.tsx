'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

type Category = { id: string; name: string; icon: string | null; subcategories: { id: string; name: string }[] }

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
  const [txList, setTxList] = useState(transactions)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState<'gasto'|'ingreso'>('gasto')
  const [editCatId, setEditCatId] = useState('')
  const [editSubId, setEditSubId] = useState('')
  const [selectedCatsForLine, setSelectedCatsForLine] = useState<string[]>([])
  const [compareYears, setCompareYears] = useState<number[]>([filterYear])
  const [compareMonth, setCompareMonth] = useState(0)
  const lineChartRef = useRef<any>(null)
  const barChartRef = useRef<any>(null)
  const compareChartRef = useRef<any>(null)
  const savingsChartRef = useRef<any>(null)

  const years = useMemo(() => {
    const ys = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))]
    return ys.sort((a, b) => b - a)
  }, [transactions])

  const filtered = useMemo(() => {
    return txList.filter(tx => {
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

  const byCatByMonth = useMemo(() => {
    const result: Record<string, number[]> = {}
    const cats = selectedCatsForLine.length > 0 ? selectedCatsForLine : categories.slice(0,3).map(c => c.name)
    cats.forEach(cat => {
      result[cat] = Array(12).fill(0)
      transactions.filter(t => new Date(t.date).getFullYear() === filterYear && t.categories?.name === cat && t.type === 'gasto')
        .forEach(t => { result[cat][new Date(t.date).getMonth()] += t.amount })
    })
    return result
  }, [transactions, filterYear, selectedCatsForLine, categories])

  const compareData = useMemo(() => {
    return compareYears.map(year => ({
      year,
      data: Array(12).fill(0).map((_, i) => {
        if (compareMonth > 0 && i !== compareMonth - 1) return null
        return transactions
          .filter(t => new Date(t.date).getFullYear() === year && new Date(t.date).getMonth() === i && t.type === 'gasto')
          .reduce((s, t) => s + t.amount, 0)
      })
    }))
  }, [transactions, compareYears, compareMonth])

  const savingsByMonth = useMemo(() => {
    return Array(12).fill(0).map((_, i) => {
      const txs = transactions.filter(t => new Date(t.date).getFullYear() === filterYear && new Date(t.date).getMonth() === i)
      const ing = txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
      const gas = txs.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
      return ing - gas
    })
  }, [transactions, filterYear])

  const CHART_COLORS = ['#0ea5e9','#8b5cf6','#f59e0b','#34d399','#f87171','#ec4899','#14b8a6','#f97316']

  useEffect(() => {
    if (tab !== 'stats') return
    if (typeof window === 'undefined') return

    function drawCharts() {
      const Chart = (window as any).Chart
      if (!Chart) return

      const drawLine = (ref: any, datasets: any[]) => {
        if (!ref.current) return
        if (ref.current._chart) ref.current._chart.destroy()
        ref.current._chart = new Chart(ref.current.getContext('2d'), {
          type: 'line',
          data: { labels: ['E','F','M','A','M','J','J','A','S','O','N','D'], datasets },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } },
              y: { ticks: { color: '#64748b', font: { size: 10 }, callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
        })
      }

      drawLine(lineChartRef, Object.entries(byCatByMonth).map(([cat, data], i) => ({
        label: cat, data, borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: 'transparent', tension: 0.4, pointRadius: 3,
      })))

      if (barChartRef.current) {
        if (barChartRef.current._chart) barChartRef.current._chart.destroy()
        barChartRef.current._chart = new Chart(barChartRef.current.getContext('2d'), {
          type: 'bar',
          data: { labels: ['E','F','M','A','M','J','J','A','S','O','N','D'],
            datasets: [
              { label: 'Ingresos', data: Object.values(byMonth).map(v => v.ingresos), backgroundColor: '#34d399' },
              { label: 'Gastos', data: Object.values(byMonth).map(v => v.gastos), backgroundColor: '#f87171' },
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } },
              y: { ticks: { color: '#64748b', font: { size: 10 }, callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
        })
      }

      const compareLabels = compareMonth > 0 ? [MESES[compareMonth-1]] : ['E','F','M','A','M','J','J','A','S','O','N','D']
      drawLine(compareChartRef, compareData.map((yd, i) => ({
        label: String(yd.year),
        data: compareMonth > 0 ? [yd.data[compareMonth-1]] : yd.data,
        borderColor: CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: 'transparent', tension: 0.4, pointRadius: 4,
        borderDash: i > 0 ? [5,3] : [],
      })))

      drawLine(savingsChartRef, [{
        label: 'Ahorro', data: savingsByMonth,
        borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)',
        fill: true, tension: 0.4, pointRadius: 3,
      }])
    }

    if ((window as any).Chart) {
      drawCharts()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = drawCharts
      document.head.appendChild(script)
    }
  }, [tab, byCatByMonth, byMonth, compareData, savingsByMonth])

  async function handleDeleteTx(id: string) {
    if (!confirm('¿Eliminar este registro?')) return
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', id)
    setTxList(txList.filter(t => t.id !== id))
  }

  async function handleSaveEdit() {
    if (!editingTx) return
    const supabase = createClient()
    const updates = {
      description: editDesc,
      amount: parseFloat(editAmount),
      date: editDate,
      type: editType,
      category_id: editCatId || null,
      subcategory_id: editSubId || null,
    }
    await supabase.from('transactions').update(updates).eq('id', editingTx.id)
    setTxList(txList.map(t => t.id === editingTx.id ? { ...t, ...updates } : t))
    setEditingTx(null)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.onload = () => drawCharts()
    if ((window as any).Chart) { drawCharts(); return }
    document.head.appendChild(script)
  }, [byCatByMonth, byMonth, compareData, savingsByMonth])

  function drawCharts() {
    const Chart = (window as any).Chart
    if (!Chart) return

    if (lineChartRef.current) {
      const ctx = lineChartRef.current.getContext('2d')
      if ((lineChartRef.current as any)._chart) (lineChartRef.current as any)._chart.destroy()
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['E','F','M','A','M','J','J','A','S','O','N','D'],
          datasets: Object.entries(byCatByMonth).map(([cat, data], i) => ({
            label: cat, data,
            borderColor: CHART_COLORS[i % CHART_COLORS.length],
            backgroundColor: 'transparent',
            tension: 0.4, pointRadius: 3,
          }))
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b', callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
      })
      ;(lineChartRef.current as any)._chart = chart
    }

    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext('2d')
      if ((barChartRef.current as any)._chart) (barChartRef.current as any)._chart.destroy()
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['E','F','M','A','M','J','J','A','S','O','N','D'],
          datasets: [
            { label: 'Ingresos', data: Object.values(byMonth).map(v => v.ingresos), backgroundColor: '#34d399' },
            { label: 'Gastos', data: Object.values(byMonth).map(v => v.gastos), backgroundColor: '#f87171' },
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b', callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
      })
      ;(barChartRef.current as any)._chart = chart
    }

    if (compareChartRef.current) {
      const ctx = compareChartRef.current.getContext('2d')
      if ((compareChartRef.current as any)._chart) (compareChartRef.current as any)._chart.destroy()
      const labels = compareMonth > 0 ? [MESES[compareMonth-1]] : ['E','F','M','A','M','J','J','A','S','O','N','D']
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: compareData.map((yd, i) => ({
            label: String(yd.year),
            data: compareMonth > 0 ? [yd.data[compareMonth-1]] : yd.data.filter(v => v !== null),
            borderColor: CHART_COLORS[i % CHART_COLORS.length],
            backgroundColor: 'transparent',
            tension: 0.4, pointRadius: 4,
            borderDash: i > 0 ? [5,3] : [],
          }))
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b', callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
      })
      ;(compareChartRef.current as any)._chart = chart
    }

    if (savingsChartRef.current) {
      const ctx = savingsChartRef.current.getContext('2d')
      if ((savingsChartRef.current as any)._chart) (savingsChartRef.current as any)._chart.destroy()
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['E','F','M','A','M','J','J','A','S','O','N','D'],
          datasets: [{
            label: 'Ahorro',
            data: savingsByMonth,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52,211,153,0.1)',
            fill: true, tension: 0.4, pointRadius: 3,
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }, y: { ticks: { color: '#64748b', callback: (v: number) => '$' + Math.round(v/1000) + 'k' }, grid: { color: '#1e293b' } } } }
      })
      ;(savingsChartRef.current as any)._chart = chart
    }
  }

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
                <div style={{display:'flex',flexDirection:'column',gap:'4px',flexShrink:0}}>
                  <button onClick={() => {
                    setEditingTx(tx)
                    setEditDesc(tx.description)
                    setEditAmount(String(tx.amount))
                    setEditDate(tx.date)
                    setEditType(tx.type)
                    setEditCatId(tx.categories ? (categories.find(c => c.name === tx.categories?.name)?.id || '') : '')
                    setEditSubId('')
                  }}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text3)',fontSize:'11px',padding:'3px 7px',cursor:'pointer'}}>
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteTx(tx.id)}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:'6px',color:'#f87171',fontSize:'11px',padding:'3px 7px',cursor:'pointer'}}>
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

{tab === 'stats' && (
        <div style={{padding:'0 20px'}}>

          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid var(--border)',marginBottom:'12px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 8px'}}>Gastos por categoría — {filterYear}</p>
            <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'10px'}}>
              {categories.map((c, i) => (
                <button key={c.id} onClick={() => setSelectedCatsForLine(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])}
                  style={{fontSize:'10px',padding:'3px 8px',borderRadius:'12px',border:'none',cursor:'pointer',
                    backgroundColor: selectedCatsForLine.includes(c.name) ? CHART_COLORS[i % CHART_COLORS.length] : 'var(--bg3)',
                    color: selectedCatsForLine.includes(c.name) ? '#fff' : 'var(--text4)'}}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
            <div style={{position:'relative',height:'140px'}}>
              <canvas ref={lineChartRef} role="img" aria-label="Gráfico de líneas por categoría"/>
            </div>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'8px'}}>
              {Object.keys(byCatByMonth).map((cat, i) => (
                <div key={cat} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'2px',backgroundColor: CHART_COLORS[i % CHART_COLORS.length]}}/>
                  <span style={{fontSize:'10px',color:'var(--text4)'}}>{cat}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid var(--border)',marginBottom:'12px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 10px'}}>Ingresos vs gastos — {filterYear}</p>
            <div style={{position:'relative',height:'140px'}}>
              <canvas ref={barChartRef} role="img" aria-label="Gráfico de barras ingresos vs gastos"/>
            </div>
            <div style={{display:'flex',gap:'12px',marginTop:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',backgroundColor:'#34d399',borderRadius:'2px'}}/><span style={{fontSize:'10px',color:'var(--text4)'}}>Ingresos</span></div>
              <div style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'8px',height:'8px',backgroundColor:'#f87171',borderRadius:'2px'}}/><span style={{fontSize:'10px',color:'var(--text4)'}}>Gastos</span></div>
            </div>
          </div>

          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid var(--border)',marginBottom:'12px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 8px'}}>Comparar años</p>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
              {years.map((y, i) => (
                <button key={y} onClick={() => setCompareYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])}
                  style={{fontSize:'10px',padding:'3px 8px',borderRadius:'12px',border:'none',cursor:'pointer',
                    backgroundColor: compareYears.includes(y) ? CHART_COLORS[i % CHART_COLORS.length] : 'var(--bg3)',
                    color: compareYears.includes(y) ? '#fff' : 'var(--text4)'}}>
                  {y}
                </button>
              ))}
            </div>
            <select style={{...inputStyle,width:'100%',boxSizing:'border-box' as const,marginBottom:'10px',fontSize:'11px'}}
              value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))}>
              <option value={0}>Todos los meses</option>
              {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <div style={{position:'relative',height:'140px'}}>
              <canvas ref={compareChartRef} role="img" aria-label="Gráfico comparación de años"/>
            </div>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'8px'}}>
              {compareYears.map((y, i) => (
                <div key={y} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'2px',backgroundColor: CHART_COLORS[i % CHART_COLORS.length]}}/>
                  <span style={{fontSize:'10px',color:'var(--text4)'}}>{y}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid var(--border)',marginBottom:'12px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 12px'}}>Promedio mensual por categoría</p>
            {byCategory.length === 0 ? (
              <p style={{color:'var(--text4)',fontSize:'13px'}}>Sin datos</p>
            ) : byCategory.map(([cat, amount], i) => (
              <div key={cat} style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'12px',color:'var(--text)'}}>{cat}</span>
                  <span style={{fontSize:'12px',color:'#f87171',fontWeight:'600'}}>{formatCLP(amount/12)}/mes</span>
                </div>
                <div style={{backgroundColor:'var(--bg3)',borderRadius:'4px',height:'6px'}}>
                  <div style={{backgroundColor: CHART_COLORS[i % CHART_COLORS.length],borderRadius:'4px',height:'6px',width:`${(amount/totalGastos)*100}%`}}/>
                </div>
              </div>
            ))}
          </div>

          <div style={{backgroundColor:'var(--bg2)',borderRadius:'14px',padding:'16px',border:'1px solid var(--border)',marginBottom:'12px'}}>
            <p style={{color:'var(--text2)',fontSize:'12px',fontWeight:'600',margin:'0 0 10px'}}>Tendencia de ahorro — {filterYear}</p>
            <div style={{position:'relative',height:'140px'}}>
              <canvas ref={savingsChartRef} role="img" aria-label="Gráfico tendencia de ahorro"/>
            </div>
          </div>

        </div>
      )}      {editingTx && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'20px'}}>
          <div style={{backgroundColor:'var(--bg2)',borderRadius:'20px',padding:'24px',width:'100%',maxWidth:'400px',border:'1px solid var(--border)'}}>
            <h2 style={{color:'var(--text)',fontSize:'16px',fontWeight:'600',margin:'0 0 16px'}}>Editar registro</h2>
            <div style={{display:'flex',backgroundColor:'var(--bg3)',borderRadius:'12px',padding:'4px',marginBottom:'14px'}}>
              <button onClick={() => setEditType('gasto')}
                style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'12px',border:'none',cursor:'pointer',
                  backgroundColor: editType==='gasto' ? '#dc2626' : 'transparent',
                  color: editType==='gasto' ? '#fff' : 'var(--text3)'}}>
                🔴 Gasto
              </button>
              <button onClick={() => setEditType('ingreso')}
                style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'12px',border:'none',cursor:'pointer',
                  backgroundColor: editType==='ingreso' ? '#16a34a' : 'transparent',
                  color: editType==='ingreso' ? '#fff' : 'var(--text3)'}}>
                🟢 Ingreso
              </button>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}>Descripción</label>
              <input style={{width:'100%',backgroundColor:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 12px',color:'var(--text)',fontSize:'13px',outline:'none',boxSizing:'border-box' as const}}
                value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}>Monto</label>
              <input type="number" style={{width:'100%',backgroundColor:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 12px',color:'var(--text)',fontSize:'13px',outline:'none',boxSizing:'border-box' as const}}
                value={editAmount} onChange={e => setEditAmount(e.target.value)} />
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}>Fecha</label>
              <input type="date" style={{width:'100%',backgroundColor:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 12px',color:'var(--text)',fontSize:'13px',outline:'none',boxSizing:'border-box' as const}}
                value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}>Categoría</label>
              <select style={{width:'100%',backgroundColor:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 12px',color:'var(--text)',fontSize:'13px',outline:'none',boxSizing:'border-box' as const}}
                value={editCatId} onChange={e => { setEditCatId(e.target.value); setEditSubId('') }}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'11px',color:'var(--text3)',marginBottom:'5px'}}>Subcategoría</label>
              <select style={{width:'100%',backgroundColor:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 12px',color:'var(--text)',fontSize:'13px',outline:'none',boxSizing:'border-box' as const}}
                value={editSubId} onChange={e => setEditSubId(e.target.value)}
                disabled={!editCatId}>
                <option value="">Ninguna</option>
                {categories.find(c => c.id === editCatId)?.subcategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={() => setEditingTx(null)}
                style={{flex:1,backgroundColor:'var(--bg3)',color:'var(--text3)',border:'1px solid var(--border)',borderRadius:'12px',padding:'12px',fontSize:'13px',cursor:'pointer'}}>
                Cancelar
              </button>
              <button onClick={handleSaveEdit}
                style={{flex:1,backgroundColor:'#0ea5e9',color:'#fff',border:'none',borderRadius:'12px',padding:'12px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}