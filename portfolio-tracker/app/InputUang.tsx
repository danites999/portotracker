'use client'
import { InputHTMLAttributes, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { formatAngka, pisahAngka, polosAngka, dariPolos } from '@/lib/uang'

// Kolom nominal dengan pemisah ribuan otomatis: mengetik 10000000 langsung tampil 10.000.000 (bahasa Inggris: 10,000,000).
// Cukup ketik angka; koma (id) atau titik (en) dipakai untuk desimal. Kursor tetap di tempatnya saat angka dikelompokkan.
// Bila pengguna sendiri mengetik pemisah ribuan ("10.000.000") atau titik desimal ("1543.21" di bahasa Indonesia), teks dibiarkan
// seperti diketik dan dibaca secara cerdas, lalu dirapikan saat kolom ditinggalkan.
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  value: string
  onChange: (v: string) => void
  lokal: 'id' | 'en'
  tampil?: boolean // false (bawaan): value/onChange berupa angka polos "1234.5". true: berupa teks tampilan "1.234,5" (dibaca dengan bacaAngka)
  singkatan?: boolean // dengan tampil: izinkan huruf seperti "10jt" atau "500rb"
  desimal?: boolean // bawaan true
}

export function InputUang({ value, onChange, lokal, tampil = false, singkatan = false, desimal = true, onBlur, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const kursor = useRef<number | null>(null)
  const terakhir = useRef(value) // nilai yang terakhir dikirim ke induk
  const [manual, setManual] = useState<string | null>(null) // teks apa adanya saat pengguna mengetik pemisah sendiri
  const [, paksa] = useReducer((n: number) => n + 1, 0)
  const rb = lokal === 'id' ? '.' : ','
  const ds = lokal === 'id' ? ',' : '.'

  const kanonik = (v: string) => {
    if (tampil) return /^\d+$/.test(v) ? formatAngka({ int: v, frac: null }, lokal) : v
    const a = dariPolos(v)
    return a ? formatAngka(a, lokal) : v
  }
  const manualAktif = manual !== null && value === terakhir.current
  const tampilan = manualAktif ? (manual as string) : kanonik(value)

  const kirim = (v: string) => { terakhir.current = v; onChange(v) }
  const bentuk = (a: ReturnType<typeof pisahAngka>) => (desimal ? a : { ...a, frac: null })

  const ubah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const ne = e.nativeEvent as InputEvent
    const ketik = typeof ne.data === 'string' ? ne.data : ''
    const tempel = ne.inputType === 'insertFromPaste' || ne.inputType === 'insertFromDrop'
    const posisi = e.target.selectionStart ?? raw.length

    if (tampil && singkatan && /[a-zA-Z]/.test(raw)) { setManual(null); kursor.current = null; kirim(raw); paksa(); return } // mis. "10jt"

    const mulaiManual = !manualAktif && (ketik === rb || (tempel && raw.includes(rb)))
    if (manualAktif || mulaiManual) {
      // titik ribuan yang disisipkan otomatis tidak ikut dihitung; yang diketik pengguna dipertahankan
      const teks = mulaiManual && !tempel ? raw.slice(0, posisi - 1).split(rb).join('') + rb + raw.slice(posisi).split(rb).join('') : raw
      const bersih = teks.replace(/[^0-9.,]/g, '')
      const a = bentuk(pisahAngka(bersih, lokal))
      setManual(bersih); kursor.current = null
      kirim(tampil ? bersih : polosAngka(a))
    } else {
      const a = bentuk(pisahAngka(raw.split(rb).join(''), lokal)) // titik/koma ribuan yang tampil adalah hasil rapi otomatis
      kursor.current = (raw.slice(0, posisi).match(new RegExp(`[0-9${ds === '.' ? '\\.' : ds}]`, 'g')) || []).length
      setManual(null)
      kirim(tampil ? formatAngka(a, lokal) : polosAngka(a))
    }
    paksa()
  }

  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (manual !== null) {
      if (tampil && manualAktif) { const k = formatAngka(bentuk(pisahAngka(manual, lokal)), lokal); if (k !== value) kirim(k) }
      setManual(null)
    }
    onBlur?.(e)
  }

  useLayoutEffect(() => {
    const el = ref.current, n = kursor.current
    if (!el || n === null || document.activeElement !== el) return
    kursor.current = null
    let hitung = 0, i = 0
    const s = el.value
    while (i < s.length && hitung < n) { if (/[0-9]/.test(s[i]) || s[i] === ds) hitung++; i++ }
    el.setSelectionRange(i, i)
  })

  return <input {...rest} ref={ref} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={tampilan} onChange={ubah} onBlur={blur} />
}
