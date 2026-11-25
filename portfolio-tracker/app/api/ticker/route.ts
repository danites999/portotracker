import { NextResponse } from 'next/server'

// Data untuk running text harga pasar (komponen Ticker).
// ?saham=BBCA,BBRI  &us=AAPL,VOO  &mata=USD,EUR   -> { items: [{ jenis, n, h, p }] }
//   jenis: 'indeks' | 'saham' | 'us' | 'emas' | 'kurs'   n: nama   h: harga terakhir   p: perubahan % dibanding penutupan sebelumnya
// Sumber: Yahoo Finance (endpoint tidak resmi, bisa dibatasi sewaktu-waktu). Item yang gagal diambil dilewati.
type Item = { jenis: string; n: string; h: number; p: number }
type Kutip = { h: number; prev: number }

const H = { 'User-Agent': 'Mozilla/5.0' }
const SAHAM_UMUM = ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM', 'ASII', 'GOTO', 'ANTM']
const MATA_UMUM = ['USD', 'EUR', 'SGD', 'JPY']
const GRAM_PER_OUNCE = 31.1035

const daftar = (v: string | null, re: RegExp, maks: number) =>
  Array.from(new Set((v || '').split(',').map(s => s.trim().toUpperCase()).filter(k => re.test(k)))).slice(0, maks)

async function kutip(sym: string): Promise<Kutip | null> {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`, { headers: H, next: { revalidate: 120 } })
    if (!r.ok) return null
    const res = (await r.json())?.chart?.result?.[0]
    const cl: number[] = (res?.indicators?.quote?.[0]?.close || []).filter((c: any) => typeof c === 'number' && isFinite(c))
    const h = typeof res?.meta?.regularMarketPrice === 'number' ? res.meta.regularMarketPrice : cl[cl.length - 1]
    const prev = cl.length >= 2 ? cl[cl.length - 2] : res?.meta?.chartPreviousClose
    if (typeof h !== 'number' || typeof prev !== 'number' || !isFinite(h) || !isFinite(prev) || prev === 0) return null
    return { h, prev }
  } catch {
    return null
  }
}
const pct = (k: Kutip) => ((k.h - k.prev) / k.prev) * 100

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const saham = daftar(sp.get('saham'), /^[A-Z0-9]{2,6}$/, 30)
  const us = daftar(sp.get('us'), /^[A-Z0-9.-]{1,10}$/, 30)
  const mata = daftar(sp.get('mata'), /^[A-Z]{3}$/, 10).filter(m => m !== 'IDR')
  const sahamSemua = Array.from(new Set([...saham, ...SAHAM_UMUM])) // milik pengguna tampil lebih dulu
  const mataSemua = Array.from(new Set([...mata, ...MATA_UMUM]))

  const [ihsg, gc, usd, hs, hu, hm] = await Promise.all([
    kutip('^JKSE'),
    kutip('GC=F'),
    kutip('USDIDR=X'),
    Promise.all(sahamSemua.map(k => kutip(`${k}.JK`))),
    Promise.all(us.map(k => kutip(k.replace('.', '-')))),
    Promise.all(mataSemua.map(m => kutip(`${m}IDR=X`))),
  ])

  const items: Item[] = []
  if (ihsg) items.push({ jenis: 'indeks', n: 'IHSG', h: ihsg.h, p: pct(ihsg) })
  sahamSemua.forEach((k, i) => { const x = hs[i]; if (x) items.push({ jenis: 'saham', n: k, h: x.h, p: pct(x) }) })
  us.forEach((k, i) => { const x = hu[i]; if (x) items.push({ jenis: 'us', n: k, h: x.h, p: pct(x) }) })
  if (gc && usd) { // emas dunia (USD per ounce) x kurs USD/IDR, per gram
    const g = (gc.h * usd.h) / GRAM_PER_OUNCE, awal = (gc.prev * usd.prev) / GRAM_PER_OUNCE
    items.push({ jenis: 'emas', n: 'Emas/gr', h: g, p: ((g - awal) / awal) * 100 })
  }
  mataSemua.forEach((m, i) => { const x = hm[i]; if (x) items.push({ jenis: 'kurs', n: `${m}/IDR`, h: x.h, p: pct(x) }) })

  if (!items.length) return NextResponse.json({ items: [], error: true }, { status: 502 })
  return NextResponse.json({ items, waktu: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } })
}
