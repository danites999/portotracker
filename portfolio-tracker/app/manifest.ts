import type { MetadataRoute } from 'next'

// Manifest aplikasi: nama dan ikon saat web ini dipasang ke layar utama HP ("Tambahkan ke layar utama" / "Instal aplikasi").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buat Masa Depan',
    short_name: 'Masa Depan',
    description: 'Pantau portofolio, rencanakan tujuan keuangan, dan analisis investasi Anda',
    start_url: '/',
    display: 'standalone',
    lang: 'id',
    background_color: '#0C2623',
    theme_color: '#0C2623',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
