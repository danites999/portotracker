import { Data } from './types'
import { totalTerima, mataTerima } from './penerimaan'
export const rp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: Math.abs(n) < 1000 ? 2 : 0 }).format(n)
export type Baris = { id: string; nama: string; sub: string; modal: number; nilai: number; terima?: number; beli?: number; kini?: number; info?: string; warn?: boolean; est?: number }
const hari = (a: string, b = new Date()) => Math.floor((b.getTime() - new Date(a).getTime()) / 864e5)

export function hitung(d: Data, t: (s: string) => string = s => s) {
  const h = d.harga, nol = t('Harga belum tersedia, nilai memakai modal')
  const saham: Baris[] = d.saham.map(a => { const p = h.saham[a.kode], modal = a.lembar * a.hargaBeli
    return { id: a.id, nama: a.kode, sub: `${a.lembar / 100} lot (${a.lembar} ${t('lembar')})`, modal, nilai: p ? a.lembar * p : modal, beli: a.hargaBeli, kini: p, info: p ? undefined : nol, warn: !p } })
  const reksa: Baris[] = d.reksa.map(a => { const u = hari(a.tglNav)
    return { id: a.id, nama: a.nama, sub: `${t(a.jenis)}, ${a.unit} ${t('unit')}`, modal: a.unit * a.navBeli, nilai: a.unit * a.navTerbaru, beli: a.navBeli, kini: a.navTerbaru, info: `${t('NAV diperbarui')} ${u} ${t('hari lalu')}` + (u > 7 ? `, ${t('perlu diperbarui')}` : ''), warn: u > 7 } })
  const crypto: Baris[] = d.crypto.map(a => { const p = h.crypto[a.coinId], bi = a.mata === 'USD' ? a.hargaBeli * h.kurs : a.hargaBeli, modal = a.jumlah * bi
    return { id: a.id, nama: a.simbol, sub: `${a.jumlah.toLocaleString(t('id-ID'), { maximumFractionDigits: 8 })} ${t('koin')}`, modal, nilai: p ? a.jumlah * p : modal, beli: bi, kini: p, info: p ? undefined : nol, warn: !p } })
  const forex: Baris[] = (d.forex || []).map(a => { const p = (h.forex || {})[a.mata], modal = a.jumlah * a.kursBeli
    return { id: a.id, nama: a.mata, sub: `${a.jumlah.toLocaleString(t('id-ID'))} ${a.mata}`, modal, nilai: p ? a.jumlah * p : modal, beli: a.kursBeli, kini: p, info: p ? undefined : t('Kurs belum tersedia, nilai memakai modal'), warn: !p } })
  const emas: Baris[] = (d.emas || []).map(a => { const man = a.hargaManual > 0, p = man ? a.hargaManual : h.emas, modal = a.gram * a.hargaBeli
    return { id: a.id, nama: t(a.jenis), sub: `${a.gram} gram`, modal, nilai: p ? a.gram * p : modal, beli: a.hargaBeli, kini: p || undefined,
      info: man ? t('Harga manual') : p ? t('Harga emas dunia per gram, bisa berbeda dari harga toko/Antam') : nol, warn: !man && !p } })
  const properti: Baris[] = (d.properti || []).map(a => { const u = hari(a.tglNilai)
    return { id: a.id, nama: a.nama, sub: t(a.jenis) + (a.lokasi ? `, ${a.lokasi}` : ''), modal: a.hargaBeli, nilai: a.nilai, info: `${t('Estimasi nilai diperbarui')} ${u} ${t('hari lalu')}` + (u > 365 ? `, ${t('perlu diperbarui')}` : ''), warn: u > 365 } })
  const deposito: Baris[] = d.deposito.map(a => {
    const mulai = new Date(a.tanggal), now = new Date()
    const tambah = (n: number) => { const x = new Date(mulai); x.setMonth(x.getMonth() + n); return x }
    let jt = tambah(a.tenor)
    if (a.aro) { let n = a.tenor; while (jt < now && n < 1200) { n += a.tenor; jt = tambah(n) } }
    const hariTenor = (jt.getTime() - mulai.getTime()) / 864e5
    const hr = Math.max(0, Math.min(hari(a.tanggal), a.aro ? 1e9 : hariTenor))
    const net = 1 - a.pajak / 100
    const sisa = Math.max(0, Math.ceil((jt.getTime() - now.getTime()) / 864e5))
    return { id: a.id, nama: a.bank, sub: `${a.bunga}%${t('/thn')}, ${a.tenor} ${t('bln')}${a.aro ? ', ARO' : ''}`, modal: a.pokok,
      nilai: a.pokok + a.pokok * a.bunga / 100 * hr / 365 * net, est: a.pokok + a.pokok * a.bunga / 100 * hariTenor / 365 * net,
      info: `${t('Jatuh tempo')} ${jt.toLocaleDateString(t('id-ID'), { day: 'numeric', month: 'short', year: 'numeric' })} (${sisa} ${t('hari lagi')}). ${t('Nilai = pokok + bunga bersih berjalan')}` }
  })
  // Saham AS & ETF: harga dalam USD, nilai dan modal dikonversi dengan kurs USD/IDR terbaru (selisih kurs tidak ikut dihitung).
  const ussaham: Baris[] = (d.ussaham || []).map(a => { const p = (h.us || {})[a.kode], kurs = h.kurs, modal = a.jumlah * a.hargaBeli * kurs
    return { id: a.id, nama: a.kode, sub: `${a.jumlah.toLocaleString(t('id-ID'), { maximumFractionDigits: 8 })} ${t('lembar')} · ${t(a.jenis || 'Saham')}`, modal, nilai: p ? a.jumlah * p * kurs : modal, beli: a.hargaBeli * kurs, kini: p ? p * kurs : undefined,
      info: p ? `US$${p.toLocaleString(t('id-ID'), { maximumFractionDigits: 2 })} × ${t('kurs')} ${rp(kurs)}` : nol, warn: !p } })
  const hasil = { saham, ussaham, reksa, crypto, forex, emas, properti, deposito }
  // Penerimaan (dividen, kupon, sewa) ikut dihitung sebagai bagian dari hasil investasi. Penerimaan USD dikonversi dengan kurs terbaru.
  const asal: Record<string, any[]> = { saham: d.saham, ussaham: d.ussaham || [], reksa: d.reksa, crypto: d.crypto, forex: d.forex || [], emas: d.emas || [], properti: d.properti || [], deposito: d.deposito }
  ;(Object.keys(hasil) as (keyof typeof hasil)[]).forEach(k => { if (k === 'deposito' || k === 'forex' || k === 'emas') return
    hasil[k].forEach(r => { const a = asal[k].find(x => x.id === r.id); if (a) r.terima = totalTerima(a) * (mataTerima(k as any, a) === 'USD' ? h.kurs : 1) }) })
  return hasil
}
