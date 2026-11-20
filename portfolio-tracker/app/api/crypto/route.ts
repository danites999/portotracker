import { NextResponse } from 'next/server'
// ?q=bit -> pencarian coin (autocomplete). ?ids=bitcoin,ethereum -> harga IDR + kurs USD/IDR (dari harga tether).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams, q = sp.get('q')
  try {
    if (q) {
      const j = await (await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q.slice(0, 30))}`, { next: { revalidate: 3600 } })).json()
      return NextResponse.json({ coins: (j.coins || []).slice(0, 8).map((c: any) => ({ id: c.id, symbol: c.symbol, name: c.name })) })
    }
    const ids = Array.from(new Set((sp.get('ids') || '').split(',').map(s => s.trim().toLowerCase()).filter(s => /^[a-z0-9-]{1,60}$/.test(s)))).slice(0, 50)
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...ids, 'tether'].join(',')}&vs_currencies=idr`, { next: { revalidate: 60 } })
    if (!r.ok) throw 0
    const j = await r.json(), harga: Record<string, number> = {}
    ids.forEach(i => { if (j[i]?.idr) harga[i] = j[i].idr })
    return NextResponse.json({ harga, kurs: j.tether?.idr || null, waktu: new Date().toISOString() }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } })
  } catch { return NextResponse.json({ harga: {}, kurs: null, coins: [], error: true }, { status: 502 }) }
}
