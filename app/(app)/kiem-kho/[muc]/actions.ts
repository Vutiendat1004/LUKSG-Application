'use server'
import { revalidatePath } from 'next/cache'
import { layNhanVien, coNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { laMuc } from '@/lib/muc'
import { docSo } from '@/lib/doc-so'
import { baoSauKiemKho } from '@/lib/thong-bao'

export type KetQuaDem =
  | { ok: true; so_mon: number; can_dat: { ten: string; trang_thai: string }[] }
  | { ok: false; loi: string }

export async function ghiKiemKho(muc: string, dong: { id: number; so_luong: string }[]): Promise<KetQuaDem> {
  if (!laMuc(muc)) return { ok: false, loi: 'Mục không hợp lệ.' }
  const nv = await layNhanVien()
  if (!coNhom(nv, 'inn')) return { ok: false, loi: 'Bạn chưa được cấp quyền kiểm kho.' }

  const luot = crypto.randomUUID()
  const rows: { mat_hang_id: number; so_luong: number; nguoi_id: string; nguoi_ten: string; luot_id: string }[] = []
  for (const d of dong) {
    const n = docSo(d.so_luong)
    if (n === null) return { ok: false, loi: `Số "${d.so_luong}" không hợp lệ.` }
    rows.push({ mat_hang_id: d.id, so_luong: n, nguoi_id: nv.id, nguoi_ten: nv.ho_ten, luot_id: luot })
  }
  if (rows.length === 0) return { ok: false, loi: 'Chưa điền món nào.' }

  const sb = await supabaseServer()
  const { error } = await sb.from('kiem_kho').insert(rows)
  if (error) return { ok: false, loi: `Không lưu được: ${error.message}` }

  const { data } = await sb.from('v_de_xuat_dat_hang').select('ten, trang_thai').eq('muc', muc).lte('muc_do', 3).order('muc_do')
  try {
    await baoSauKiemKho(sb, muc, nv.ho_ten)
  } catch (e) {
    console.error('[kiem-kho] gửi email lỗi', e)
  }
  revalidatePath('/')
  return { ok: true, so_mon: rows.length, can_dat: (data ?? []) as { ten: string; trang_thai: string }[] }
}
