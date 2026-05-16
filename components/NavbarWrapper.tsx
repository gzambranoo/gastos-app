'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname === '/login'

  function handleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div>
      {children}
      {!hideNav && (
        <>
          <button
            onClick={handleFullscreen}
            title="Pantalla completa"
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg2)',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            ⛶
          </button>
          <Navbar />
        </>
      )}
    </div>
  )
}