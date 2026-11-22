import { NextResponse } from 'next/server'
// Harga berjalan untuk running text: IHSG, saham, emas dunia per gram (IDR), dan kurs. Sumber Yahoo Finance (tidak resmi, saham tertunda).
// ?saham=BBCA,BBNI&mata=USD,EUR  ->  { items: [{ jenis, n, h, p }] }  h = harga (IDR/poin), p = perubahan % dibanding penutupan sebelumnya
const H = { 'User-Agent': 'Mozilla/5.0' }
type K = { h: number; prev?: number }

async function kutip(sym: string): Promise<K | null> {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, { headers: H, next: { revalidate: 300 } })
    if (!r.ok) return null
    const res = (await r.json())?.chart?.result?.[0]
    const cl: number[] = (res?.indicators?.quote?.[0]?.close || []).filter((x: any) => typeof x === 'number' && isFinite(x))
    const live = res?.meta?.regularMarketPrice
    const h = typeof live === 'number' ? live : cl[cl.length - 1]
    if (typeof h !== 'number') return null
    return { h, prev: cl.length >= 2 ? cl[cl.length - 2] : undefined }
  } catch { return null }
}
const pers = (k: K) => (k.prev ? ((k.h - k.prev) / k.prev) * 100 : 0)

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const saham = Array.from(new Set((sp.get('saham') || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9]{2,6}$/.test(s)))).slice(0, 25)
  const mata = Array.from(new Set((sp.get('mata') || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{3}$/.test(s) && s !== 'IDR'))).slice(0, 10)
  const [ihsg, usd, gold, ...sisa] = await Promise.all([kutip('^JKSE'), kutip('USDIDR=X'), kutip('GC=F'), ...saham.map(s => kutip(`${s}.JK`)), ...mata.map(m => (m === 'USD' ? Promise.resolve(null) : kutip(`${m}IDR=X`)))])
  const hs = sisa.slice(0, saham.length), hm = sisa.slice(saham.length)
  const items: { jenis: string; n: string; h: number; p: number }[] = []
  if (ihsg) items.push({ jenis: 'indeks', n: 'IHSG', h: ihsg.h, p: pers(ihsg) })
  saham.forEach((s, i) => { const k = hs[i]; if (k) items.push({ jenis: 'saham', n: s, h: k.h, p: pers(k) }) })
  if (gold && usd) { const k: K = { h: (gold.h * usd.h) / 31.1035, prev: gold.prev && usd.prev ? (gold.prev * usd.prev) / 31.1035 : undefined }; items.push({ jenis: 'emas', n: 'Emas/gr', h: k.h, p: pers(k) }) }
  mata.forEach((m, i) => { const k = m === 'USD' ? usd : hm[i]; if (k) items.push({ jenis: 'forex', n: `${m}/IDR`, h: k.h, p: pers(k) }) })
  return NextResponse.json({ items, waktu: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } })
}
