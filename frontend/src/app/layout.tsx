import type { Metadata } from 'next'
import { Raleway } from 'next/font/google'
import './globals.css'
import '@/styles/design-system.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-raleway'
})

export const metadata: Metadata = {
  title: 'SADA-AI Appointment Setter',
  description: 'Multi-tenant call analytics for AI agencies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={raleway.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
