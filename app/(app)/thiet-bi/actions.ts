'use server'
import { revalidatePath } from 'next/cache'
import { layNhanVien, coNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { baoGiaoDichThietBi, type KetQuaThietBi } from '@/lib/thong-bao'

export type KetQuaHD = ({ ok: true } & KetQuaThietBi) | { ok: false; loi: string }

export async function thucHien(
  hd: 'muon' | 'tra' | 'chuyen',
  ma: string[],
  f: { han_tra?: string; nguoi_muon?: string; tinh_trang?: string; chi_nhanh?: 'HN' | 'ĐN'; nguoi_nhan?: string; ghi_chu?: string },
): Promise<KetQuaHD> {
  const nv = await layNhanVien()
  if (!coNhom(nv, 'media')) return { ok: false, loi: 'Bạn chưa được cấp quyền dùng phần thiết bị.' }
  const sb = await supabaseServer()
  const ghiChu = f.ghi_chu?.trim() || null

  let res
  if (hd === 'muon') {
    res = await sb.rpc('muon_thiet_bi', { p_ma: ma, p_han_tra: f.han_tra, p_ghi_chu: ghiChu, p_nguoi_muon: f.nguoi_muon ?? null })
  } else if (hd === 'tra') {
    res = await sb.rpc('tra_thiet_bi', { p_ma: ma, p_tinh_trang: f.tinh_trang ?? 'Bình thường', p_ghi_chu: ghiChu })
  } else {
    res = await sb.rpc('chuyen_chi_nhanh', { p_ma: ma, p_chi_nhanh: f.chi_nhanh, p_nguoi_nhan: f.nguoi_nhan ?? '', p_ghi_chu: ghiChu })
  }
  if (res.error) return { ok: false, loi: res.error.message }

  const kq = res.data as KetQuaThietBi
  try {
    await baoGiaoDichThietBi(sb, kq, ghiChu ?? undefined)
  } catch (e) {
    console.error('[thiet-bi] gửi email lỗi', e)
  }
  revalidatePath('/')
  revalidatePath('/cua-toi')
  return { ok: true, ...kq }
}
