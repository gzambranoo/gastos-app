import type { Metadata } from 'next'
import './globals.css'
import NavbarWrapper from '@/components/NavbarWrapper'

export const metadata: Metadata = {
  title: 'Gastos App',
  description: 'Control de gastos personal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gastos App" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script dangerouslySetInnerHTML={{__html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'light') {
              document.documentElement.classList.add('light');
              document.documentElement.classList.remove('dark');
            } else {
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
            }
          } catch(e) {}
        `}} />
      </head>
      <body style={{margin:0,padding:0}} suppressHydrationWarning>
        <NavbarWrapper>{children}</NavbarWrapper>
      </body>
    </html>
  )
}