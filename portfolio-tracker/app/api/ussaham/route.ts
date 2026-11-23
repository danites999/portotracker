import { NextResponse } from 'next/server'
// Harga saham AS dan ETF (USD) dari Yahoo Finance (endpoint tidak resmi). ?kode=AAPL,VOO,BRK.B
export async function GET(req: Request) {
  const kode = Array.from(new Set((new URL(req.url).searchParams.get('kode') || '').split(',').map(s => s.trim().toUpperCase()).filter(k => /^[A-Z0-9.-]{1,10}$/.test(k)))).slice(0, 30)
  const harga: Record<string, number> = {}, gagal: string[] = []
  await Promise.all(kode.map(async k => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(k.replace('.', '-'))}?interval=1d&range=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 120 } })
      if (!r.ok) throw 0
      const p = (await r.json())?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (typeof p !== 'number') throw 0
      harga[k] = p
    } catch { gagal.push(k) }
  }))
  return NextResponse.json({ harga, gagal, waktu: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } })
}
