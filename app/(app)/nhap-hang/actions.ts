'use server'
import { revalidatePath } from 'next/cache'
import { layNhanVien, coNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { docSo } from '@/lib/doc-so'

export async function ghiNhapHang(
  dong: { id: number; so_luong: string }[],
  ghiChu: string,
): Promise<{ ok: true; so_mon: number } | { ok: false; loi: string }> {
  const nv = await layNhanVien()
  if (!coNhom(nv, 'inn')) return { ok: false, loi: 'Bạn chưa được cấp quyền nhập hàng.' }
  const rows = []
  for (const d of dong) {
    const n = docSo(d.so_luong)
    if (n === null || n <= 0) return { ok: false, loi: `Số "${d.so_luong}" không hợp lệ.` }
    rows.push({ mat_hang_id: d.id, so_luong: n, nguoi_id: nv.id, nguoi_ten: nv.ho_ten, ghi_chu: ghiChu.trim() || null })
  }
  if (rows.length === 0) return { ok: false, loi: 'Chưa điền món nào.' }
  const sb = await supabaseServer()
  const { error } = await sb.from('nhap_hang').insert(rows)
  if (error) return { ok: false, loi: `Không lưu được: ${error.message}` }
  revalidatePath('/nhap-hang')
  return { ok: true, so_mon: rows.length }
}
