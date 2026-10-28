import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LUK SG',
    short_name: 'LUK SG',
    description: 'Kiểm kho LUK Inn và mượn trả thiết bị Media SG',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f6f4',
    theme_color: '#f3f6f4',
    lang: 'vi',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
