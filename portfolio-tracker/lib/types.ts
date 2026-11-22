export type Kelas = 'saham' | 'reksa' | 'crypto' | 'forex' | 'emas' | 'properti' | 'deposito'
export type Aset = { id: string; [k: string]: any }
export type Harga = { saham: Record<string, number>; crypto: Record<string, number>; forex: Record<string, number>; emas: number; kurs: number; waktu: { saham?: string; crypto?: string; forex?: string } }
export type Data = { saham: Aset[]; reksa: Aset[]; crypto: Aset[]; forex: Aset[]; emas: Aset[]; properti: Aset[]; deposito: Aset[]; riwayat: { t: string; v: number; m?: number }[]; harga: Harga }
