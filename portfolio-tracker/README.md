# Portfolio Tracker

Next.js (App Router) + TypeScript + Tailwind + Recharts. Data tersimpan di localStorage browser.

## Jalankan lokal
```
npm install
npm run dev
```
Buka http://localhost:3000

## Deploy ke Vercel (tanpa instal apa pun)
1. Buat repository baru di github.com.
2. Di repository: Add file > Upload files, seret ISI folder proyek ini (bukan file zip-nya). Jangan upload node_modules atau .next.
3. Login ke vercel.com dengan akun GitHub, klik Add New > Project, pilih repository tadi, lalu Deploy.
4. Buka link `.vercel.app` dari HP atau laptop.

## Catatan sumber data
- Saham: Yahoo Finance (endpoint tidak resmi, tertunda ±10-15 menit).
- Crypto: CoinGecko. Kurs USD/IDR diambil dari harga tether (pendekatan).
- Forex: Yahoo Finance (USDIDR=X dst.), cadangan open.er-api.com (harian). Kurs tengah, bukan kurs jual/beli money changer atau bank.
- Reksadana: NAV diisi manual. Deposito: dihitung di aplikasi.

## Upgrade ke Supabase
Semua akses data ada di `lib/storage.ts` (muat, simpan). Ganti isinya dengan query Supabase + login, lalu jadikan fungsinya async.

## Login dan akun (Supabase)
Tanpa pengaturan ini aplikasi tetap jalan tanpa login (data di browser). Untuk login/daftar dan data tersimpan per akun:
1. Buat project gratis di supabase.com.
2. SQL Editor > New query > tempel isi `supabase.sql` > Run.
3. Project Settings > API: salin Project URL dan anon public key.
4. Di Vercel: Project > Settings > Environment Variables, tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`, lalu Redeploy.
5. (Opsional) Authentication > Providers > Email: matikan Confirm email kalau tidak mau konfirmasi lewat email. Jangan pernah memakai service_role key di aplikasi ini.
Data lama di localStorage tidak ikut pindah otomatis: Ekspor JSON sebelum login, lalu Impor setelah login.

## Emas dan properti
- Emas: harga otomatis = harga emas dunia (GC=F) x kurs USD/IDR per gram, bisa berbeda dari harga toko/Antam. Isi "harga jual sekarang" untuk memakai harga sendiri.
- Properti: estimasi nilai diisi manual.
