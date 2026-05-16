'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: '/', icon: '🏠', label: 'Inicio' },
    { href: '/agregar', icon: '➕', label: 'Agregar' },
    { href: '/historial', icon: '📊', label: 'Stats' },
    { href: '/deudas', icon: '💳', label: 'Deudas' },
    { href: '/configuracion', icon: '⚙️', label: 'Config.' },
  ]

  return (
    <nav style={{position:'fixed',bottom:'0',left:'0',right:'0',backgroundColor:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-around',alignItems:'center',padding:'8px 0 12px',zIndex:50}}>
      {links.map(link => {
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
        return (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',background:'none',border:'none',cursor:'pointer',padding:'4px 12px'}}
          >
            <span style={{fontSize:'20px'}}>{link.icon}</span>
            <span style={{fontSize:'10px',color: isActive ? '#0ea5e9' : 'var(--text4)',fontWeight: isActive ? '600' : '400'}}>
              {link.label}
            </span>
            {isActive && (
              <div style={{width:'4px',height:'4px',borderRadius:'50%',backgroundColor:'#0ea5e9'}}/>
            )}
          </button>
        )
      })}
    </nav>
  )
}