// Login memakai username: di balik layar diubah jadi email "username@DOMAIN" karena Supabase Auth butuh email.
export const DOMAIN = 'portfolio-tracker.app'
export const keEmail = (u: string) => { const x = u.trim(); return x.includes('@') ? x : `${x.toLowerCase()}@${DOMAIN}` }
export const namaDari = (e?: string) => (e && e.endsWith(`@${DOMAIN}`) ? e.slice(0, -(DOMAIN.length + 1)) : '')
