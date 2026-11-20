import { NextResponse } from 'next/server'
// Kurs valas terhadap IDR (Yahoo, cadangan open.er-api.com harian). ?emas=1 menambah harga emas dunia per gram dalam IDR (GC=F x USDIDR / 31,1035).
const H = { 'User-Agent': 'Mozilla/5.0' }
const yh = async (sym: string) => { try { const p = (await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, { headers: H, next: { revalidate: 120 } })).json())?.chart?.result?.[0]?.meta?.regularMarketPrice; return typeof p === 'number' ? p : undefined } catch { return undefined } }
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams, emas = sp.get('emas') === '1'
  const mata = Array.from(new Set((sp.get('mata') || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{3}$/.test(s) && s !== 'IDR'))).slice(0, 20)
  if (emas && !mata.includes('USD')) mata.push('USD')
  const harga: Record<string, number> = {}
  await Promise.all(mata.map(async m => { const p = await yh(`${m}IDR=X`); if (p) harga[m] = p }))
  const sisa = mata.filter(m => !harga[m])
  if (sisa.length) {
    try { const j = await (await fetch('https://open.er-api.com/v6/latest/IDR', { next: { revalidate: 3600 } })).json(); sisa.forEach(m => { const r = j?.rates?.[m]; if (r) harga[m] = 1 / r }) } catch {}
  }
  let g: number | undefined
  if (emas && harga.USD) { const p = await yh('GC=F'); if (p) g = (p * harga.USD) / 31.1035 }
  return NextResponse.json({ harga, emas: g, gagal: mata.filter(m => !harga[m]), waktu: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } })
}
