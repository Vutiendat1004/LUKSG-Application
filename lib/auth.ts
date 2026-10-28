import { redirect } from 'next/navigation'
import { supabaseServer } from './supabase/server'

/** Tên đăng nhập được đổi thành email nội bộ này (không ai nhận thư ở đây). */
export const MIEN_DANG_NHAP = 'nhanvien.luksg.vn'

export function emailDangNhap(tenDangNhap: string) {
  return `${tenDangNhap.trim().toLowerCase()}@${MIEN_DANG_NHAP}`
}

export function hopLeTenDangNhap(t: string) {
  return /^[a-z0-9._-]{2,32}$/.test(t)
}

export type NhanVien = {
  id: string
  ten_dang_nhap: string
  ho_ten: string
  email: string | null
  nhom: string[]
  vai_tro: 'nhan_vien' | 'quan_ly'
  dang_lam: boolean
  khoa_muon_den: string | null
}

export function coNhom(nv: NhanVien, nhom: 'inn' | 'media') {
  return nv.vai_tro === 'quan_ly' || nv.nhom.includes(nhom)
}

/** Lấy nhân viên đang đăng nhập. Chưa đăng nhập → về trang đăng nhập. */
export async function layNhanVien(): Promise<NhanVien> {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap')
  const { data } = await supabase.from('nhan_vien').select('*').eq('id', user.id).maybeSingle()
  if (!data || !data.dang_lam) redirect('/dang-nhap?loi=chua-cap-quyen')
  return data as NhanVien
}

export async function canNhom(nhom: 'inn' | 'media') {
  const nv = await layNhanVien()
  if (!coNhom(nv, nhom)) redirect('/')
  return nv
}

export async function canQuanLy() {
  const nv = await layNhanVien()
  if (nv.vai_tro !== 'quan_ly') redirect('/')
  return nv
}
