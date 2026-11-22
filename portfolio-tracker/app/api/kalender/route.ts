import { NextResponse } from 'next/server'
// Kalender ekonomi dunia (minggu ini + minggu depan) dari feed publik Forex Factory (nfs.faireconomy.media), tanpa API key.
// Cakupan: ekonomi utama (USD, EUR, GBP, JPY, CNY, AUD, dst). Tidak mencakup data Indonesia.
const URLS = ['https://nfs.faireconomy.media/ff_calendar_thisweek.json', 'https://nfs.faireconomy.media/ff_calendar_nextweek.json']
const teks = (x: any) => (x == null ? '' : String(x).slice(0, 80))

export async function GET() {
  const hasil = await Promise.allSettled(URLS.map(async u => {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 1800 } })
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  }))
  const items = hasil.flatMap(h => (h.status === 'fulfilled' && Array.isArray(h.value) ? h.value : []))
    .map((e: any) => { const w = Date.parse(e?.date); return { judul: teks(e?.title), negara: teks(e?.country), waktu: isFinite(w) ? new Date(w).toISOString() : '', dampak: teks(e?.impact), perkiraan: teks(e?.forecast), sebelumnya: teks(e?.previous) } })
    .filter(e => e.judul && e.waktu)
    .sort((a, b) => (a.waktu < b.waktu ? -1 : a.waktu > b.waktu ? 1 : 0))
  if (!items.length) return NextResponse.json({ items: [], error: true }, { status: 502 })
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' } })
}
