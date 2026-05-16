'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Revisa tu email para confirmar tu cuenta.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage('Email o contraseña incorrectos.')
      else router.push('/')
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessage('Ingresa tu email primero y luego haz clic aquí.')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setMessage(error.message)
    else setMessage('Te enviamos un email para restablecer tu contraseña.')
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#020617',padding:'16px'}}>
      <div style={{width:'100%',maxWidth:'380px'}}>

        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontSize:'40px',marginBottom:'12px'}}>💰</div>
          <h1 style={{fontSize:'24px',fontWeight:'600',color:'#ffffff',margin:'0'}}>Gastos App</h1>
          <p style={{fontSize:'14px',color:'#94a3b8',marginTop:'4px'}}>Control de gastos personal</p>
        </div>

        <div style={{backgroundColor:'#0f172a',borderRadius:'20px',padding:'24px',border:'1px solid #1e293b'}}>

          <div style={{display:'flex',backgroundColor:'#1e293b',borderRadius:'12px',padding:'4px',marginBottom:'24px'}}>
            <button
              onClick={() => setMode('login')}
              style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'13px',fontWeight:'500',border:'none',cursor:'pointer',backgroundColor: mode==='login' ? '#0ea5e9' : 'transparent',color: mode==='login' ? '#ffffff' : '#94a3b8',transition:'all 0.2s'}}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setMode('register')}
              style={{flex:1,padding:'8px',borderRadius:'8px',fontSize:'13px',fontWeight:'500',border:'none',cursor:'pointer',backgroundColor: mode==='register' ? '#0ea5e9' : 'transparent',color: mode==='register' ? '#ffffff' : '#94a3b8',transition:'all 0.2s'}}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#94a3b8',marginBottom:'6px'}}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                style={{width:'100%',backgroundColor:'#1e293b',border:'1px solid #334155',borderRadius:'12px',padding:'12px 16px',color:'#ffffff',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>

            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#94a3b8',marginBottom:'6px'}}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{width:'100%',backgroundColor:'#1e293b',border:'1px solid #334155',borderRadius:'12px',padding:'12px 16px',color:'#ffffff',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>

            {mode === 'login' && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
                <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{width:'16px',height:'16px',accentColor:'#0ea5e9',cursor:'pointer'}}
                  />
                  <span style={{fontSize:'12px',color:'#94a3b8'}}>Recordar contraseña</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{fontSize:'12px',color:'#0ea5e9',background:'none',border:'none',cursor:'pointer',padding:'0'}}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {message && (
              <div style={{backgroundColor:'#1e293b',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#38bdf8',textAlign:'center'}}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{width:'100%',backgroundColor:'#0ea5e9',color:'#ffffff',border:'none',borderRadius:'12px',padding:'13px',fontSize:'14px',fontWeight:'500',cursor:'pointer',opacity: loading ? 0.6 : 1}}
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}