'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canQuanLy, emailDangNhap, hopLeTenDangNhap } from '@/lib/auth'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server'
import { docSo } from '@/lib/doc-so'
import { homNay } from '@/lib/ngay'

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const sOrNull = (f: FormData, k: string) => s(f, k) || null
const n = (f: FormData, k: string) => docSo(f.get(k))

function ve(path: string, ok?: string, loi?: string): never {
  const u = new URL(path, 'http://x')
  if (ok) u.searchParams.set('ok', ok)
  if (loi) u.searchParams.set('loi', loi)
  redirect(u.pathname + u.search)
}

function duongDanAnToan(p: string, macDinh: string) {
  return p.startsWith('/quan-ly') ? p : macDinh
}

// ---------------- Đặt hàng ----------------

export async function ghiNhanDaDat(f: FormData) {
  const nv = await canQuanLy()
  const quayLai = duongDanAnToan(s(f, 'quay_lai'), '/quan-ly/dat-hang')
  const ncc = s(f, 'ncc') ? Number(s(f, 'ncc')) : null
  const rows: { mat_hang_id: number; so_luong: number; ncc_id: number | null; nguoi_id: string; ngay_dat: string }[] = []
  for (const [k, v] of f.entries()) {
    if (!k.startsWith('sl_')) continue
    const sl = docSo(v)
    if (sl && sl > 0) rows.push({ mat_hang_id: Number(k.slice(3)), so_luong: sl, ncc_id: ncc, nguoi_id: nv.id, ngay_dat: homNay() })
  }
  if (rows.length === 0) ve(quayLai, undefined, 'Không có số lượng nào để ghi.')
  const sb = await supabaseServer()
  const { error } = await sb.from('dat_hang').insert(rows)
  if (error) ve(quayLai, undefined, error.message)
  revalidatePath('/quan-ly')
  ve(quayLai, `Đã ghi nhận đặt ${rows.length} món.`)
}

export async function capNhatDon(f: FormData) {
  await canQuanLy()
  const tt = s(f, 'trang_thai')
  if (!['da_nhan', 'huy'].includes(tt)) return
  const sb = await supabaseServer()
  await sb.from('dat_hang').update({ trang_thai: tt }).eq('id', Number(s(f, 'id')))
  revalidatePath('/quan-ly/dat-hang')
}

// ---------------- Danh mục ----------------

export async function luuMatHang(f: FormData) {
  await canQuanLy()
  const id = s(f, 'id')
  const loai = s(f, 'loai')
  const data = {
    ma: s(f, 'ma').toUpperCase(),
    ten: s(f, 'ten'),
    loai,
    don_vi: s(f, 'don_vi'),
    ncc_id: s(f, 'ncc_id') ? Number(s(f, 'ncc_id')) : null,
    don_gia: n(f, 'don_gia'),
    sl_dung_thang: n(f, 'sl_dung_thang'),
    sl_dung_ngay: n(f, 'sl_dung_ngay'),
    ngay_giao: n(f, 'ngay_giao') ?? 1,
    chu_ky_dat: n(f, 'chu_ky_dat') ?? 7,
    ton_an_toan: n(f, 'ton_an_toan') ?? 2,
    boi_so: n(f, 'boi_so') || 1,
    thu_tu: Math.round(n(f, 'thu_tu') ?? 0),
    dang_dung: f.get('dang_dung') === 'on',
    ghi_chu: sOrNull(f, 'ghi_chu'),
  }
  const back = id ? `/quan-ly/danh-muc/${id}` : '/quan-ly/danh-muc/moi'
  if (!data.ma || !data.ten) ve(back, undefined, 'Cần có mã và tên.')
  if (!['Fruit', 'Ingredient', 'Hygiene', 'Logistic'].includes(loai)) ve(back, undefined, 'Chọn loại.')
  const sb = await supabaseServer()
  const { error } = id ? await sb.from('mat_hang').update(data).eq('id', Number(id)) : await sb.from('mat_hang').insert(data)
  if (error) ve(back, undefined, error.message.includes('duplicate') ? 'Mã này đã có.' : error.message)
  revalidatePath('/quan-ly/danh-muc')
  ve('/quan-ly/danh-muc', `Đã lưu ${data.ten}.`)
}

export async function luuNcc(f: FormData) {
  await canQuanLy()
  const id = s(f, 'id')
  const data = { ten: s(f, 'ten'), sdt: sOrNull(f, 'sdt'), zalo: sOrNull(f, 'zalo'), ghi_chu: sOrNull(f, 'ghi_chu') }
  if (!data.ten) ve('/quan-ly/danh-muc', undefined, 'Cần có tên nhà cung cấp.')
  const sb = await supabaseServer()
  const { error } = id ? await sb.from('nha_cung_cap').update(data).eq('id', Number(id)) : await sb.from('nha_cung_cap').insert(data)
  if (error) ve('/quan-ly/danh-muc', undefined, error.message)
  ve('/quan-ly/danh-muc', `Đã lưu nhà cung cấp ${data.ten}.`)
}

// ---------------- Thiết bị ----------------

export async function luuThietBi(f: FormData) {
  await canQuanLy()
  const maCu = s(f, 'ma_cu')
  const ma = s(f, 'ma').toUpperCase()
  const back = maCu ? `/quan-ly/thiet-bi/${encodeURIComponent(maCu)}` : '/quan-ly/thiet-bi/moi'
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(ma)) ve(back, undefined, 'Mã chỉ gồm chữ, số và dấu gạch, vd EQ013-02.')
  const maGoc = s(f, 'ma_goc').toUpperCase() || ma.split('-')[0]
  const data = {
    ma,
    ma_goc: maGoc,
    ten: s(f, 'ten'),
    serial: sOrNull(f, 'serial'),
    gia_tri: n(f, 'gia_tri'),
    ghi_chu: sOrNull(f, 'ghi_chu'),
  }
  if (!data.ten) ve(back, undefined, 'Cần có tên thiết bị.')
  const sb = await supabaseServer()
  const { data: loai } = await sb.from('loai_thiet_bi').select('ma_goc').eq('ma_goc', maGoc).maybeSingle()
  if (!loai) {
    const { error } = await sb.from('loai_thiet_bi').insert({ ma_goc: maGoc, ten: s(f, 'ten_loai') || data.ten, sl_chuan: 0 })
    if (error) ve(back, undefined, error.message)
  }
  const { error } = maCu
    ? await sb.from('thiet_bi').update(data).eq('ma', maCu)
    : await sb.from('thiet_bi').insert({ ...data, trang_thai: 'Trong kho' })
  if (error) ve(back, undefined, error.message.includes('duplicate') ? 'Mã này đã có.' : error.message)
  revalidatePath('/quan-ly/thiet-bi')
  ve(`/quan-ly/thiet-bi/${encodeURIComponent(ma)}`, 'Đã lưu.')
}

export async function doiTrangThaiTB(f: FormData) {
  await canQuanLy()
  const ma = s(f, 'ma')
  const tt = s(f, 'trang_thai')
  const back = duongDanAnToan(s(f, 'quay_lai'), `/quan-ly/thiet-bi/${encodeURIComponent(ma)}`)
  if (!['Trong kho', 'Cần kiểm tra', 'Cần sửa chữa', 'Đã chuyển HN', 'Đã chuyển ĐN'].includes(tt)) ve(back, undefined, 'Trạng thái không hợp lệ.')
  const sb = await supabaseServer()
  const update: Record<string, string> = { trang_thai: tt }
  const lyDo = s(f, 'ly_do')
  if (lyDo) {
    const { data: cu } = await sb.from('thiet_bi').select('ghi_chu').eq('ma', ma).maybeSingle()
    update.ghi_chu = [cu?.ghi_chu, lyDo].filter(Boolean).join(' | ')
  }
  const { error } = await sb.from('thiet_bi').update(update).eq('ma', ma)
  if (error) ve(back, undefined, error.message)
  revalidatePath('/quan-ly/thiet-bi')
  ve(back, `${ma}: ${tt}.`)
}

export async function luuLoai(f: FormData) {
  await canQuanLy()
  const sb = await supabaseServer()
  const maGoc = s(f, 'ma_goc').toUpperCase()
  const data = {
    ten: s(f, 'ten'),
    nhom_loai: sOrNull(f, 'nhom_loai'),
    sl_chuan: Math.round(n(f, 'sl_chuan') ?? 0),
    chuyen_hn_truoc: Math.round(n(f, 'chuyen_hn_truoc') ?? 0),
    ghi_chu: sOrNull(f, 'ghi_chu'),
  }
  const { error } = await sb.from('loai_thiet_bi').update(data).eq('ma_goc', maGoc)
  if (error) ve('/quan-ly/ton-kho', undefined, error.message)
  revalidatePath('/quan-ly/ton-kho')
  ve('/quan-ly/ton-kho', `Đã lưu ${maGoc}.`)
}

export async function luuSuaChua(f: FormData) {
  await canQuanLy()
  const sb = await supabaseServer()
  const data = {
    loi: sOrNull(f, 'loi'),
    noi_sua: sOrNull(f, 'noi_sua'),
    chi_phi: n(f, 'chi_phi'),
    tinh_trang: s(f, 'tinh_trang'),
    ngay_xong: sOrNull(f, 'ngay_xong'),
    ghi_chu: sOrNull(f, 'ghi_chu'),
  }
  const { error } = await sb.from('sua_chua').update(data).eq('id', Number(s(f, 'id')))
  if (error) ve('/quan-ly/sua-chua', undefined, error.message)
  revalidatePath('/quan-ly/sua-chua')
  ve('/quan-ly/sua-chua', 'Đã lưu phiếu sửa.')
}

export async function moKhoaMuon(f: FormData) {
  await canQuanLy()
  const sb = await supabaseServer()
  await sb.from('nhan_vien').update({ khoa_muon_den: null }).eq('id', s(f, 'id'))
  ve('/quan-ly/vi-pham', 'Đã mở khoá quyền tự mượn.')
}

export async function xoaViPham(f: FormData) {
  await canQuanLy()
  const sb = await supabaseServer()
  await sb.from('vi_pham').delete().eq('id', Number(s(f, 'id')))
  ve('/quan-ly/vi-pham', 'Đã xoá ghi nhận.')
}

// ---------------- Cấu hình ----------------

export async function luuCauHinh(f: FormData) {
  await canQuanLy()
  const sb = await supabaseServer()
  const rows = [...f.entries()]
    .filter(([k]) => k.startsWith('ch_'))
    .map(([k, v]) => ({ khoa: k.slice(3), gia_tri: String(v).trim() }))
  for (const r of rows) {
    const { error } = await sb.from('cau_hinh').update({ gia_tri: r.gia_tri }).eq('khoa', r.khoa)
    if (error) ve('/quan-ly/cau-hinh', undefined, error.message)
  }
  ve('/quan-ly/cau-hinh', 'Đã lưu cấu hình.')
}

// ---------------- Nhân viên (dùng quyền quản trị) ----------------

const CAN_KHOA = 'Để tạo tài khoản và đặt lại mật khẩu, cần khai báo khoá SUPABASE_SERVICE_ROLE_KEY trên Vercel (Settings → Environments → Production → Environment Variables), rồi Redeploy.'

function nhomTuForm(f: FormData) {
  return ['inn', 'media'].filter((g) => f.get(`nhom_${g}`) === 'on')
}

export async function taoNhanVien(f: FormData) {
  await canQuanLy()
  const ten = s(f, 'ten_dang_nhap').toLowerCase()
  const mk = String(f.get('mat_khau') ?? '')
  if (!hopLeTenDangNhap(ten)) ve('/quan-ly/nhan-vien', undefined, 'Tên đăng nhập 2–32 ký tự, chỉ chữ thường không dấu, số, dấu chấm, gạch.')
  if (mk.length < 6) ve('/quan-ly/nhan-vien', undefined, 'Mật khẩu ít nhất 6 ký tự.')
  if (!s(f, 'ho_ten')) ve('/quan-ly/nhan-vien', undefined, 'Cần có họ tên.')
  let admin
  try { admin = supabaseAdmin() } catch { ve('/quan-ly/nhan-vien', undefined, CAN_KHOA) }
  const { data, error } = await admin.auth.admin.createUser({ email: emailDangNhap(ten), password: mk, email_confirm: true })
  if (error || !data.user) ve('/quan-ly/nhan-vien', undefined, error?.message.includes('already') ? 'Tên đăng nhập đã có.' : error?.message ?? 'Lỗi tạo tài khoản')
  const { error: e2 } = await admin.from('nhan_vien').insert({
    id: data.user.id,
    ten_dang_nhap: ten,
    ho_ten: s(f, 'ho_ten'),
    email: sOrNull(f, 'email'),
    nhom: nhomTuForm(f),
    vai_tro: s(f, 'vai_tro') === 'quan_ly' ? 'quan_ly' : 'nhan_vien',
  })
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id)
    ve('/quan-ly/nhan-vien', undefined, e2.message)
  }
  revalidatePath('/quan-ly/nhan-vien')
  ve('/quan-ly/nhan-vien', `Đã tạo tài khoản ${ten}.`)
}

export async function suaNhanVien(f: FormData) {
  const toi = await canQuanLy()
  const id = s(f, 'id')
  const vaiTro = s(f, 'vai_tro') === 'quan_ly' ? 'quan_ly' : 'nhan_vien'
  const dangLam = f.get('dang_lam') === 'on'
  if (id === toi.id && (vaiTro !== 'quan_ly' || !dangLam)) ve('/quan-ly/nhan-vien', undefined, 'Không tự bỏ quyền quản lý của chính mình được.')
  const sb = await supabaseServer()
  const { error } = await sb
    .from('nhan_vien')
    .update({ ho_ten: s(f, 'ho_ten'), email: sOrNull(f, 'email'), nhom: nhomTuForm(f), vai_tro: vaiTro, dang_lam: dangLam })
    .eq('id', id)
  if (error) ve('/quan-ly/nhan-vien', undefined, error.message)
  // Cập nhật email người giữ trên các thiết bị đang mượn để nhắc hạn đúng người
  await sb.from('thiet_bi').update({ email_nguoi_giu: sOrNull(f, 'email') }).eq('nguoi_giu_id', id).eq('trang_thai', 'Đang mượn')
  revalidatePath('/quan-ly/nhan-vien')
  ve('/quan-ly/nhan-vien', 'Đã lưu.')
}

export async function datLaiMatKhau(f: FormData) {
  await canQuanLy()
  const mk = String(f.get('mat_khau') ?? '')
  if (mk.length < 6) ve('/quan-ly/nhan-vien', undefined, 'Mật khẩu ít nhất 6 ký tự.')
  let admin
  try { admin = supabaseAdmin() } catch { ve('/quan-ly/nhan-vien', undefined, CAN_KHOA) }
  const { error } = await admin.auth.admin.updateUserById(s(f, 'id'), { password: mk })
  if (error) ve('/quan-ly/nhan-vien', undefined, error.message)
  ve('/quan-ly/nhan-vien', 'Đã đặt lại mật khẩu.')
}
