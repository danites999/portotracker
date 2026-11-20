// Semua akses data lewat modul ini. Untuk pindah ke Supabase, ganti isi muat/simpan (jadikan async).
import { Data } from './types'
import { sb } from './supabase'
const KEY = 'portfolio-tracker-v1'
export const kosong = (): Data => ({ saham: [], reksa: [], crypto: [], forex: [], emas: [], properti: [], deposito: [], riwayat: [], harga: { saham: {}, crypto: {}, forex: {}, emas: 0, kurs: 16000, waktu: {} } })
const gabung = (j: any): Data => { const k = kosong(); return { ...k, ...j, harga: { ...k.harga, ...(j.harga || {}) } } }
export function muat(): Data { try { const r = localStorage.getItem(KEY); return r ? gabung(JSON.parse(r)) : kosong() } catch { return kosong() } }
export function simpan(d: Data) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {} }
export function ekspor(d: Data) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }))
  a.download = `portofolio-${new Date().toISOString().slice(0, 10)}.json`; a.click()
}
export async function impor(f: File): Promise<Data> {
  const j = JSON.parse(await f.text())
  if (!j || !Array.isArray(j.saham) || !Array.isArray(j.deposito)) throw new Error('File bukan backup portofolio yang valid')
  return gabung(j)
}
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
export const contoh = (): Data => ({ ...kosong(),
  saham: [{ id: id(), kode: 'BBCA', lembar: 1000, hargaBeli: 9000, tanggal: '2026-03-10' }, { id: id(), kode: 'TLKM', lembar: 2000, hargaBeli: 3000, tanggal: '2026-05-02' }],
  reksa: [{ id: id(), nama: 'Contoh Pasar Uang', jenis: 'Pasar uang', unit: 5000, navBeli: 1500, tanggal: '2026-02-01', navTerbaru: 1520, tglNav: new Date().toISOString().slice(0, 10) }],
  crypto: [{ id: id(), coinId: 'bitcoin', simbol: 'BTC', jumlah: 0.01, hargaBeli: 60000, mata: 'USD', tanggal: '2026-04-01' }, { id: id(), coinId: 'ethereum', simbol: 'ETH', jumlah: 0.2, hargaBeli: 40000000, mata: 'IDR', tanggal: '2026-04-15' }],
  forex: [{ id: id(), mata: 'USD', jumlah: 1000, kursBeli: 16000, tanggal: '2026-06-01' }, { id: id(), mata: 'SGD', jumlah: 500, kursBeli: 12000, tanggal: '2026-07-01' }],
  emas: [{ id: id(), jenis: 'Emas batangan', gram: 10, hargaBeli: 1200000, hargaManual: 0, tanggal: '2026-01-15' }],
  properti: [{ id: id(), nama: 'Tanah Contoh', jenis: 'Tanah', lokasi: 'Lokasi contoh', hargaBeli: 300000000, nilai: 350000000, tglNilai: '2026-10-01', tanggal: '2024-05-01' }],
  deposito: [{ id: id(), bank: 'Bank Contoh', pokok: 50000000, bunga: 4.5, tanggal: '2026-09-01', tenor: 6, pajak: 20, aro: false }] })

// Mode akun (Supabase): satu baris per pengguna di tabel portfolios, dilindungi RLS.
export async function muatCloud(): Promise<Data | null> { const { data, error } = await sb!.from('portfolios').select('data').maybeSingle(); if (error) throw error; return data ? gabung(data.data) : null }
export async function simpanCloud(uid: string, d: Data) { const { error } = await sb!.from('portfolios').upsert({ user_id: uid, data: d, updated_at: new Date().toISOString() }); if (error) throw error }
