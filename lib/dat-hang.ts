import { so, ngayVN, homNay } from './ngay'
import type { DongDeXuat } from './muc'

export type NhomNcc = { ncc: string; zalo: string | null; sdt: string | null; dong: DongDeXuat[] }

/** Các món cần đặt (Khẩn, Đặt ngay, Sắp tới ngưỡng) gom theo nhà cung cấp */
export function gomTheoNcc(rows: DongDeXuat[]): NhomNcc[] {
  const can = rows.filter((r) => r.muc_do <= 3 && (r.goi_y_dat ?? 0) > 0)
  const map = new Map<string, NhomNcc>()
  for (const r of can) {
    const k = r.ten_ncc || 'Chưa có nhà cung cấp'
    if (!map.has(k)) map.set(k, { ncc: k, zalo: r.zalo_ncc, sdt: r.sdt_ncc, dong: [] })
    map.get(k)!.dong.push(r)
  }
  return [...map.values()].sort((a, b) => Math.min(...a.dong.map((d) => d.muc_do)) - Math.min(...b.dong.map((d) => d.muc_do)))
}

export function tinNhanDatHang(tenQuan: string, nhom: NhomNcc): string {
  const giao = Math.max(...nhom.dong.map((d) => Number(d.ngay_giao) || 1))
  const dong = nhom.dong.map((d) => `- ${d.ten}: ${so(d.goi_y_dat)} ${d.don_vi}`.trim())
  return [
    `Chào ${nhom.ncc === 'Chưa có nhà cung cấp' ? 'anh/chị' : nhom.ncc}, ${tenQuan} đặt hàng:`,
    ...dong,
    `Giao giúp em trước ngày ${ngayVN(homNay(giao))}. Cảm ơn ạ!`,
  ].join('\n')
}

export function linkZalo(zalo: string | null) {
  if (!zalo) return null
  const s = zalo.replace(/[^\d]/g, '')
  return s ? `https://zalo.me/${s}` : null
}
