'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname === '/login'

  return (
    <div>
      {children}
      {!hideNav && <Navbar />}
    </div>
  )
}