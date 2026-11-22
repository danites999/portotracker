import { NextResponse } from 'next/server'
// Harga historis harian per satuan (dalam IDR) dari tanggal beli sampai hari ini.
// ?k=saham&s=BBCA&dari=2026-03-10 | k=crypto&s=bitcoin | k=forex&s=USD | k=emas
// Sumber: Yahoo Finance (tidak resmi) dan CoinGecko. Bisa dibatasi sewaktu-waktu, jadi hasilnya dicache.
const H = { 'User-Agent': 'Mozilla/5.0' }
const tgl = (s: number) => new Date(s * 1000).toISOString().slice(0, 10)
type M = [string, number][]
const INDEKS: Record<string, string> = { JKSE: '^JKSE', GSPC: '^GSPC', IXIC: '^IXIC', N225: '^N225' } // IHSG, S&P 500, Nasdaq, Nikkei 225

async function yahoo(sym: string, dari: number): Promise<M> {
  const sampai = Math.floor(Date.now() / 1000) + 86400
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&period1=${dari}&period2=${sampai}`, { headers: H, next: { revalidate: 3600 } })
  if (!r.ok) throw new Error('yahoo ' + r.status)
  const res = (await r.json())?.chart?.result?.[0]
  const ts: number[] = res?.timestamp || [], cl: (number | null)[] = res?.indicators?.quote?.[0]?.close || []
  const out: M = []
  ts.forEach((t, i) => { const c = cl[i]; if (typeof c === 'number' && isFinite(c)) out.push([tgl(t), c]) })
  if (!out.length) throw new Error('kosong')
  return out
}

async function crypto(id: string, dari: number) {
  const now = Math.floor(Date.now() / 1000), batas = now - 364 * 86400, from = Math.max(dari, batas)
  const r = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=idr&from=${from}&to=${now}`, { next: { revalidate: 3600 } })
  if (!r.ok) throw new Error('coingecko ' + r.status)
  const p: [number, number][] = (await r.json())?.prices || []
  const peta = new Map<string, number>()
  p.forEach(([t, v]) => { if (typeof v === 'number') peta.set(tgl(t / 1000), v) })
  if (!peta.size) throw new Error('kosong')
  return { seri: Array.from(peta.entries()) as M, terpotong: dari < batas }
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams, k = sp.get('k') || '', s = (sp.get('s') || '').trim(), tanggal = sp.get('dari') || ''
  const t0 = Date.parse(tanggal + 'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !isFinite(t0) || t0 < Date.parse('2000-01-01') || t0 > Date.now()) return NextResponse.json({ seri: null, error: 'tanggal' }, { status: 400 })
  const dari = Math.floor(t0 / 1000) - 5 * 86400 // mundur beberapa hari: jaga-jaga beli di akhir pekan/libur
  const cache = { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' }
  try {
    if (k === 'saham' && /^[A-Za-z0-9]{2,6}$/.test(s)) return NextResponse.json({ seri: await yahoo(`${s.toUpperCase()}.JK`, dari) }, { headers: cache })
    if (k === 'indeks' && INDEKS[s]) return NextResponse.json({ seri: await yahoo(INDEKS[s], dari) }, { headers: cache })
    if (k === 'forex' && /^[A-Za-z]{3}$/.test(s)) return NextResponse.json({ seri: await yahoo(`${s.toUpperCase()}IDR=X`, dari) }, { headers: cache })
    if (k === 'crypto' && /^[a-z0-9-]{1,60}$/.test(s)) { const c = await crypto(s, dari); return NextResponse.json(c, { headers: cache }) }
    if (k === 'emas') {
      // Emas dunia per gram dalam IDR = GC=F (USD/oz) x USDIDR / 31,1035
      const [g, u] = await Promise.all([yahoo('GC=F', dari), yahoo('USDIDR=X', dari)])
      const kurs = [...u].sort((a, b) => (a[0] < b[0] ? -1 : 1)); let i = 0, cur = kurs[0][1]
      const seri: M = [...g].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([t, v]) => { while (i < kurs.length && kurs[i][0] <= t) { cur = kurs[i][1]; i++ } return [t, (v * cur) / 31.1035] as [string, number] })
      return NextResponse.json({ seri }, { headers: cache })
    }
    return NextResponse.json({ seri: null, error: 'param' }, { status: 400 })
  } catch { return NextResponse.json({ seri: null, error: true }, { status: 502 }) }
}
