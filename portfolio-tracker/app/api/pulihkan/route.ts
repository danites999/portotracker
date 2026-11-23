import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto'
import { namaDari } from '@/lib/akun'

// Pemulihan kata sandi untuk akun username (yang tidak punya email asli).
//  POST { aksi: 'status' | 'buat' }  + header Authorization: Bearer <token login>  -> cek / buat kode pemulihan baru (tampil sekali)
//  POST { aksi: 'reset', username, kode, sandi }                                    -> ganti kata sandi memakai kode pemulihan
// Butuh env var SUPABASE_SERVICE_ROLE_KEY (RAHASIA, hanya di server, jangan diawali NEXT_PUBLIC_) dan tabel "recovery" (lihat supabase.sql).
export const runtime = 'nodejs'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa I, O, 0, 1 yang mudah tertukar
const norm = (k: string) => k.toUpperCase().replace(/[^A-Z0-9]/g, '')
const bentuk = () => (Array.from({ length: 20 }, () => ALFABET[randomInt(ALFABET.length)]).join('').match(/.{4}/g) as string[]).join('-')
const hash = (kode: string, salt: string) => scryptSync(norm(kode), salt, 32).toString('hex')
const sama = (a: string, b: string) => { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length === y.length && timingSafeEqual(x, y) }
const j = (b: any, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } })

async function reset(sb: any, b: any) {
  const username = String(b.username || '').trim().toLowerCase(), kode = norm(String(b.kode || '')), sandi = String(b.sandi || '')
  if (!/^[a-z0-9_.]{3,20}$/.test(username) || kode.length !== 20) return j({ error: 'salah' }, 400)
  if (sandi.length < 6 || sandi.length > 72) return j({ error: 'sandi' }, 400)
  const { data: row } = await sb.from('recovery').select('*').eq('username', username).maybeSingle()
  if (!row) { hash(kode, 'x'.repeat(32)); return j({ error: 'salah' }, 400) } // waktu proses disamakan agar username tidak bisa ditebak
  if (row.terkunci_sampai && new Date(row.terkunci_sampai) > new Date()) return j({ error: 'terkunci' }, 429)
  if (!sama(hash(kode, row.salt), row.code_hash)) {
    const gagal = (row.gagal || 0) + 1 // 5 kali salah -> dikunci 15 menit
    await sb.from('recovery').update(gagal >= 5 ? { gagal: 0, terkunci_sampai: new Date(Date.now() + 15 * 60000).toISOString() } : { gagal }).eq('user_id', row.user_id)
    return j({ error: 'salah' }, 400)
  }
  const { error } = await sb.auth.admin.updateUserById(row.user_id, { password: sandi })
  if (error) return j({ error: 'gagal', detail: error.message }, 400)
  await sb.from('recovery').delete().eq('user_id', row.user_id) // kode sekali pakai; setelah login pengguna diminta membuat yang baru
  return j({ ok: true })
}

export async function POST(req: Request) {
  if (!URL_ || !KEY) return j({ error: 'config' }, 503)
  const sb = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  let b: any
  try { b = await req.json() } catch { return j({ error: 'param' }, 400) }
  if (b?.aksi === 'reset') return reset(sb, b)

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const { data } = token ? await sb.auth.getUser(token) : { data: null as any }
  const user = data?.user
  if (!user) return j({ error: 'auth' }, 401)
  const nama = namaDari(user.email || '')
  if (!nama) return j({ ada: true, email: true }) // akun dengan email asli memakai reset email bawaan Supabase

  if (b?.aksi === 'status') {
    const { data: row, error } = await sb.from('recovery').select('user_id').eq('user_id', user.id).maybeSingle()
    if (error) return j({ error: 'db', detail: error.message }, 500)
    return j({ ada: !!row })
  }
  if (b?.aksi === 'buat') {
    const kode = bentuk(), salt = randomBytes(16).toString('hex')
    const { error } = await sb.from('recovery').upsert({ user_id: user.id, username: nama, salt, code_hash: hash(kode, salt), gagal: 0, terkunci_sampai: null, dibuat: new Date().toISOString() })
    if (error) return j({ error: 'db', detail: error.message }, 500)
    return j({ kode })
  }
  return j({ error: 'param' }, 400)
}
