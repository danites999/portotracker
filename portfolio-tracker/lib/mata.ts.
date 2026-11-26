// Daftar mata uang yang didukung (kode, nama) dan pemformat nilai uang non-rupiah.
// Dipakai oleh Kalkulator forex dan pilihan mata uang tampilan. Kurs diambil lewat /api/forex (terhadap IDR).
export const MATA: [string, string][] = [
  ['IDR', 'Rupiah Indonesia'], ['USD', 'Dolar AS'], ['EUR', 'Euro'], ['GBP', 'Pound Inggris'], ['JPY', 'Yen Jepang'], ['SGD', 'Dolar Singapura'],
  ['AUD', 'Dolar Australia'], ['CNY', 'Yuan China'], ['MYR', 'Ringgit Malaysia'], ['SAR', 'Riyal Saudi'], ['HKD', 'Dolar Hong Kong'], ['KRW', 'Won Korea'],
  ['THB', 'Baht Thailand'], ['CHF', 'Franc Swiss'], ['CAD', 'Dolar Kanada'], ['NZD', 'Dolar Selandia Baru'], ['INR', 'Rupee India'], ['AED', 'Dirham UAE'],
  ['PHP', 'Peso Filipina'], ['TWD', 'Dolar Taiwan'],
]

// Format nilai dalam mata uang tertentu sesuai bahasa. Angka kecil (< 1) diberi lebih banyak desimal agar tidak tampil 0.
export function formatMata(n: number, kode: string, loc: string): string {
  const standar = new Intl.NumberFormat(loc, { style: 'currency', currency: kode }).resolvedOptions().maximumFractionDigits ?? 2
  const abs = Math.abs(n)
  const maks = Math.max(standar, abs >= 1 || abs === 0 ? standar : abs >= 0.01 ? 4 : 8)
  return new Intl.NumberFormat(loc, { style: 'currency', currency: kode, minimumFractionDigits: standar, maximumFractionDigits: maks }).format(n)
}
