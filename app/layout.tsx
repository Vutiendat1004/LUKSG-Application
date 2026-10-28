import type { Metadata, Viewport } from 'next'
import '@fontsource/afacad/400.css'
import '@fontsource/afacad/600.css'
import '@fontsource/afacad/700.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'LUK SG',
  description: 'Kiểm kho LUK Inn và mượn trả thiết bị Media SG',
  applicationName: 'LUK SG',
  appleWebApp: { capable: true, title: 'LUK SG', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3f6f4',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
