import type { SupabaseClient } from '@supabase/supabase-js'
import { guiEmail, khung, bang, doanVan } from './email'
import { docCauHinh, noiDungDatHang } from './thong-bao'
import { MUC, MUC_KEYS, type DongDeXuat, type MucKey } from './muc'
import { homNay, thuHomNay, ngayVN } from './ngay'

type KetQua = { viec: string; ghi_chu: string }

/** 7h · Báo cáo đặt hàng LUK Inn */
export async function baoCaoDatHang(sb: SupabaseClient): Promise<KetQua> {
  const ch = await docCauHinh(sb)
  if (!ch.email_quan_ly_inn) return { viec: 'bao-cao-dat-hang', ghi_chu: 'Chưa điền email_quan_ly_inn' }
  const { data, error } = await sb.from('v_de_xuat_dat_hang').select('*')
  if (error) throw error
  const rows = (data ?? []) as DongDeXuat[]
  const can = rows.filter((r) => r.muc_do <= 3)
  const chuaDem = rows.filter((r) => r.trang_thai === 'Chưa kiểm kho')
  const khan = can.filter((r) => r.trang_thai === 'KHẨN').length
  await guiEmail({
    to: [ch.email_quan_ly_inn],
    subject: `${khan ? '[KHẨN] ' : ''}Báo cáo đặt hàng ${ngayVN(homNay())}: ${can.length} món cần đặt`,
    html: khung(
      `Báo cáo đặt hàng ${ngayVN(homNay())}`,
      noiDungDatHang(rows, ch.ten_quan || 'LUK Inn SG') +
        (chuaDem.length ? doanVan(`${chuaDem.length} món chưa từng được kiểm kho: ${chuaDem.map((r) => r.ten).join(', ')}.`) : ''),
    ),
  })
  return { viec: 'bao-cao-dat-hang', ghi_chu: `${can.length} món cần đặt` }
}

/** 23h · Nhắc kiểm kho nếu hôm nay đến lịch mà chưa đếm */
export async function nhacKiemKho(sb: SupabaseClient): Promise<KetQua> {
  const ch = await docCauHinh(sb)
  const thu = thuHomNay()
  const denLich: MucKey[] = MUC_KEYS.filter((m) => {
    const k = MUC[m].khoaThu
    return !k || (ch[k] || 'CN').toUpperCase() === thu
  })
  const tuNgay = `${homNay()}T00:00:00+07:00`
  const chuaDem: MucKey[] = []
  for (const m of denLich) {
    const { count } = await sb
      .from('kiem_kho')
      .select('id, mat_hang!inner(muc)', { count: 'exact', head: true })
      .eq('mat_hang.muc', m)
      .gte('thoi_diem', tuNgay)
    if (!count) chuaDem.push(m)
  }
  if (chuaDem.length === 0) return { viec: 'nhac-kiem-kho', ghi_chu: 'Đã đếm đủ' }

  const to: (string | null)[] = [ch.email_quan_ly_inn]
  if ((ch.nhac_23h_gui_nhan_vien || 'co') === 'co') {
    const { data: nv } = await sb.from('nhan_vien').select('email, nhom').eq('dang_lam', true).contains('nhom', ['inn'])
    to.push(...(nv ?? []).map((x) => x.email as string | null))
  }
  const ten = chuaDem.map((m) => MUC[m].ten).join(', ')
  await guiEmail({
    to,
    subject: `Nhắc kiểm kho: hôm nay chưa đếm ${ten}`,
    html: khung('Nhắc kiểm kho', doanVan(`Hôm nay (${ngayVN(homNay())}) chưa có số kiểm kho cho: ${ten}.`) + doanVan('Mở app → Kiểm kho để đếm trước khi về.')),
  })
  return { viec: 'nhac-kiem-kho', ghi_chu: `Chưa đếm: ${ten}` }
}

/** 9h · Kiểm tra quá hạn, ghi vi phạm, nhắc người giữ, báo cấp trên khi bậc 3 */
export async function kiemTraQuaHan(sb: SupabaseClient): Promise<KetQua> {
  const ch = await docCauHinh(sb)
  const { data, error } = await sb.rpc('kiem_tra_qua_han')
  if (error) throw error
  const rows = (data ?? []) as {
    ma: string; ten: string; nguoi_giu_ten: string | null; email_nguoi_giu: string | null
    han_tra: string; so_ngay: number; bac: number | null; xu_ly: string | null; moi: boolean
  }[]
  if (rows.length === 0) return { viec: 'kiem-tra-qua-han', ghi_chu: 'Không có món quá hạn' }

  const theoNguoi = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = (r.email_nguoi_giu || r.nguoi_giu_ten || '?').toLowerCase()
    theoNguoi.set(k, [...(theoNguoi.get(k) ?? []), r])
  }
  for (const ds of theoNguoi.values()) {
    const bacMax = Math.max(...ds.map((d) => d.bac ?? 1))
    const xuLy = ds.find((d) => d.bac === bacMax)?.xu_ly
    await guiEmail({
      to: [ds[0].email_nguoi_giu],
      cc: [ch.email_team_media],
      subject: `Quá hạn trả ${ds.length} thiết bị`,
      html: khung(
        'Thiết bị quá hạn trả',
        doanVan(`Chào ${ds[0].nguoi_giu_ten ?? 'bạn'}, các thiết bị dưới đây đã quá hạn trả. Vui lòng trả hoặc báo team Media để gia hạn.`) +
          bang(['Mã', 'Thiết bị', 'Hạn trả', 'Quá'], ds.map((d) => [d.ma, d.ten, ngayVN(d.han_tra), `${d.so_ngay} ngày`])) +
          (xuLy ? doanVan(`Mức xử lý hiện tại: ${xuLy}.`) : ''),
      ),
    })
  }
  const bac3Moi = rows.filter((r) => r.moi && (r.bac ?? 0) >= 3)
  if (bac3Moi.length) {
    await guiEmail({
      to: [ch.email_cap_tren || ch.email_quan_ly_media],
      cc: [ch.email_quan_ly_media],
      subject: `Báo cáo vi phạm bậc 3: ${bac3Moi.map((r) => r.nguoi_giu_ten).join(', ')}`,
      html: khung(
        'Vi phạm bậc 3 · Báo cáo cấp trên',
        doanVan('Các trường hợp dưới đây đã quá hạn trả thiết bị lần thứ 3 trở lên trong thời gian tính vi phạm. Đề nghị xử lý theo nội quy công ty.') +
          bang(['Người giữ', 'Mã', 'Thiết bị', 'Quá'], bac3Moi.map((r) => [r.nguoi_giu_ten, r.ma, r.ten, `${r.so_ngay} ngày`])),
      ),
    })
  }
  return { viec: 'kiem-tra-qua-han', ghi_chu: `${rows.length} món quá hạn` }
}

/** 17h · Nhắc "ngày mai đến hạn trả" */
export async function nhacSapDenHan(sb: SupabaseClient): Promise<KetQua> {
  const { data } = await sb
    .from('thiet_bi')
    .select('ma, ten, nguoi_giu_ten, email_nguoi_giu, han_tra')
    .eq('trang_thai', 'Đang mượn')
    .eq('han_tra', homNay(1))
  const rows = data ?? []
  const theoEmail = new Map<string, typeof rows>()
  for (const r of rows) if (r.email_nguoi_giu) theoEmail.set(r.email_nguoi_giu, [...(theoEmail.get(r.email_nguoi_giu) ?? []), r])
  for (const [email, ds] of theoEmail) {
    await guiEmail({
      to: [email],
      subject: `Ngày mai (${ngayVN(homNay(1))}) đến hạn trả ${ds.length} thiết bị`,
      html: khung('Sắp đến hạn trả', doanVan(`Chào ${ds[0].nguoi_giu_ten ?? 'bạn'}, ngày mai đến hạn trả:`) + bang(['Mã', 'Thiết bị'], ds.map((d) => [d.ma, d.ten]))),
    })
  }
  return { viec: 'nhac-sap-den-han', ghi_chu: `${rows.length} món` }
}

/** Thứ Hai 8h · Báo cáo tuần thiết bị */
export async function baoCaoTuan(sb: SupabaseClient): Promise<KetQua> {
  const ch = await docCauHinh(sb)
  const [quaHan, canKiem, suaChua, tonKho, viPham] = await Promise.all([
    sb.from('thiet_bi').select('ma, ten, nguoi_giu_ten, han_tra').eq('trang_thai', 'Đang mượn').lt('han_tra', homNay()).order('han_tra'),
    sb.from('thiet_bi').select('ma, ten, ghi_chu').eq('trang_thai', 'Cần kiểm tra').order('ma'),
    sb.from('sua_chua').select('ma_thiet_bi, ngay_bao, loi, noi_sua, tinh_trang').in('tinh_trang', ['Chờ sửa', 'Đang sửa']).order('ngay_bao'),
    sb.from('v_ton_kho_thiet_bi').select('ma_goc, ten, sl_chuan, hien_co_sg, con_muon_duoc, chua_ro').order('ma_goc'),
    sb.from('vi_pham').select('ngay, nguoi_ten, ma_thiet_bi, loai, so_ngay, xu_ly').gte('ngay', homNay(-7)).order('ngay'),
  ])
  const het = (tonKho.data ?? []).filter((r) => r.hien_co_sg > 0 && r.con_muon_duoc === 0)
  const chuaRo = (tonKho.data ?? []).filter((r) => r.chua_ro > 0)
  const phan: string[] = []
  const muc = (tieuDe: string, cot: string[], dong: (string | number | null)[][]) =>
    phan.push(`<h3 style="font-size:16px;margin:18px 0 4px">${tieuDe} (${dong.length})</h3>` + (dong.length ? bang(cot, dong) : doanVan('Không có.')))
  muc('Đang quá hạn', ['Mã', 'Thiết bị', 'Người giữ', 'Hạn trả'], (quaHan.data ?? []).map((r) => [r.ma, r.ten, r.nguoi_giu_ten, ngayVN(r.han_tra)]))
  muc('Cần kiểm tra', ['Mã', 'Thiết bị', 'Ghi chú'], (canKiem.data ?? []).map((r) => [r.ma, r.ten, r.ghi_chu]))
  muc('Đang sửa chữa', ['Mã', 'Báo ngày', 'Lỗi', 'Nơi sửa', 'Tình trạng'], (suaChua.data ?? []).map((r) => [r.ma_thiet_bi, ngayVN(r.ngay_bao), r.loi, r.noi_sua, r.tinh_trang]))
  muc('Hết đồ để mượn', ['Mã gốc', 'Loại', 'Hiện có ở SG'], het.map((r) => [r.ma_goc, r.ten, r.hien_co_sg]))
  muc('Vi phạm 7 ngày qua', ['Ngày', 'Người', 'Mã', 'Loại', 'Xử lý'], (viPham.data ?? []).map((r) => [ngayVN(r.ngay), r.nguoi_ten, r.ma_thiet_bi, r.loai, r.xu_ly]))
  if (chuaRo.length) phan.push(doanVan(`Còn ${chuaRo.reduce((s, r) => s + r.chua_ro, 0)} món chưa rõ vị trí so với số chuẩn (xem trang Tồn kho thiết bị).`))
  await guiEmail({
    to: [ch.email_team_media],
    cc: [ch.email_quan_ly_media],
    subject: `Báo cáo tuần thiết bị Media SG · ${ngayVN(homNay())}`,
    html: khung('Báo cáo tuần thiết bị', phan.join('')),
  })
  return { viec: 'bao-cao-tuan', ghi_chu: 'Đã gửi' }
}

/** Thứ Sáu 16h · "Bạn đang giữ" */
export async function banDangGiu(sb: SupabaseClient): Promise<KetQua> {
  const { data } = await sb
    .from('thiet_bi')
    .select('ma, ten, nguoi_giu_ten, email_nguoi_giu, han_tra')
    .eq('trang_thai', 'Đang mượn')
    .order('han_tra')
  const rows = data ?? []
  const theoEmail = new Map<string, typeof rows>()
  for (const r of rows) if (r.email_nguoi_giu) theoEmail.set(r.email_nguoi_giu, [...(theoEmail.get(r.email_nguoi_giu) ?? []), r])
  for (const [email, ds] of theoEmail) {
    await guiEmail({
      to: [email],
      subject: `Bạn đang giữ ${ds.length} thiết bị`,
      html: khung(
        'Bạn đang giữ',
        doanVan(`Chào ${ds[0].nguoi_giu_ten ?? 'bạn'}, trước khi nghỉ cuối tuần, kiểm tra lại các thiết bị bạn đang giữ:`) +
          bang(['Mã', 'Thiết bị', 'Hạn trả'], ds.map((d) => [d.ma, d.ten, ngayVN(d.han_tra)])),
      ),
    })
  }
  return { viec: 'ban-dang-giu', ghi_chu: `${theoEmail.size} người` }
}

export const VIEC: Record<string, (sb: SupabaseClient) => Promise<KetQua>> = {
  'bao-cao-dat-hang': baoCaoDatHang,
  'nhac-kiem-kho': nhacKiemKho,
  'kiem-tra-qua-han': kiemTraQuaHan,
  'nhac-sap-den-han': nhacSapDenHan,
  'bao-cao-tuan': baoCaoTuan,
  'ban-dang-giu': banDangGiu,
}

