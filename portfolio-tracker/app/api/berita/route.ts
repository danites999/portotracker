import { NextResponse } from 'next/server'
// Berita terbaru dari RSS Google News (tanpa API key, tidak resmi). ?q=kata+kunci&lang=id|en
// Mengambil berita 24 jam terakhir; kalau kurang dari 3, melebar ke 7 hari.
const dekode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim()
const ambilTag = (x: string, tag: string) => { const m = x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)); return m ? dekode(m[1]) : '' }

function urai(xml: string) {
  return xml.split('<item>').slice(1).map(it => {
    const sumber = ambilTag(it, 'source'), judul0 = ambilTag(it, 'title'), tgl = Date.parse(ambilTag(it, 'pubDate'))
    const judul = sumber && judul0.endsWith(` - ${sumber}`) ? judul0.slice(0, -(sumber.length + 3)) : judul0
    return { judul, link: ambilTag(it, 'link'), sumber, waktu: isFinite(tgl) ? new Date(tgl).toISOString() : '' }
  }).filter(b => b.judul && /^https?:\/\//.test(b.link))
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams, q = (sp.get('q') || '').trim().slice(0, 80)
  if (!q) return NextResponse.json({ items: [] })
  const loc = sp.get('lang') === 'en' ? 'hl=en-US&gl=US&ceid=US:en' : 'hl=id&gl=ID&ceid=ID:id'
  const ambil = async (w: string) => {
    const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${w}`)}&${loc}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 600 } })
    if (!r.ok) throw new Error('news ' + r.status)
    return urai(await r.text())
  }
  try {
    let items = await ambil('1d'), rentang = '1d'
    if (items.length < 3) { items = await ambil('7d'); rentang = '7d' }
    items.sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
    return NextResponse.json({ items: items.slice(0, 12), rentang }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
  } catch { return NextResponse.json({ items: [], error: true }, { status: 502 }) }
}
