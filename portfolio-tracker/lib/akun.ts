// Login memakai username: di balik layar diubah jadi email "username@DOMAIN" karena Supabase Auth butuh email.
export const DOMAIN = 'portfolio-tracker.app'
export const keEmail = (u: string) => { const x = u.trim(); return x.includes('@') ? x : `${x.toLowerCase()}@${DOMAIN}` }
export const namaDari = (e?: string) => (e && e.endsWith(`@${DOMAIN}`) ? e.slice(0, -(DOMAIN.length + 1)) : '')
// Nama untuk sapaan di header: "dani" -> "Dani", "dani_febrian" -> "Dani Febrian". Akun email asli memakai bagian sebelum @.
export const namaSapaan = (e?: string) =>
  (namaDari(e) || (e ? e.split('@')[0] : ''))
    .split(/[._\-+]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
