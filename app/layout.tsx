import type { Metadata } from 'next'
import './globals.css'
import NavbarWrapper from '@/components/NavbarWrapper'

export const metadata: Metadata = {
  title: 'Gastos App',
  description: 'Control de gastos personal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{margin:0,padding:0,backgroundColor:'#020617'}}>
        <NavbarWrapper>{children}</NavbarWrapper>
      </body>
    </html>
  )
}