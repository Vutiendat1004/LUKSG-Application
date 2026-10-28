import type { SupabaseClient } from '@supabase/supabase-js'
import { guiEmail, khung, bang, doanVan, khoiTinNhan, esc } from './email'
import { gomTheoNcc, tinNhanDatHang } from './dat-hang'
import { MUC, type DongDeXuat, type MucKey } from './muc'
import { so, ngayVN } from './ngay'

export async function docCauHinh(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from('cau_hinh').select('khoa, gia_tri')
  return Object.fromEntries((data ?? []).map((r) => [r.khoa, r.gia_tri ?? '']))
}

/** Nội dung email đặt hàng: bảng các món cần đặt + tin nhắn soạn sẵn theo NCC */
export function noiDungDatHang(rows: DongDeXuat[], tenQuan: string): string {
  const can = rows.filter((r) => r.muc_do <= 3).sort((a, b) => a.muc_do - b.muc_do)
  if (can.length === 0) return doanVan('Chưa có món nào cần đặt.')
  const bangMon = bang(
    ['Trạng thái', 'Món', 'Tồn ước tính', 'Gợi ý đặt', 'Đặt chậm nhất'],
    can.map((r) => [r.trang_thai, r.ten, `${so(r.ton_uoc_tinh)} ${r.don_vi}`, `${so(r.goi_y_dat)} ${r.don_vi}`, ngayVN(r.ngay_dat_cham_nhat)]),
  )
  const tin = gomTheoNcc(rows)
    .map((n) => `<p style="margin:12px 0 2px"><b>${esc(n.ncc)}</b>${n.zalo ? ` · Zalo ${esc(n.zalo)}` : ''}</p>${khoiTinNhan(tinNhanDatHang(tenQuan, n))}`)
    .join('')
  return bangMon + (tin ? `<h3 style="font-size:16px;margin:18px 0 4px">Tin nhắn đặt hàng soạn sẵn</h3>${tin}` : '')
}

/** Gửi ngay sau một lần kiểm kho nếu mục đó có món Khẩn / Đặt ngay / Sắp tới ngưỡng */
export async function baoSauKiemKho(sb: SupabaseClient, muc: MucKey, nguoi: string) {
  const ch = await docCauHinh(sb)
  if (!ch.email_quan_ly_inn) return
  const { data } = await sb.from('v_de_xuat_dat_hang').select('*').eq('muc', muc)
  const rows = (data ?? []) as DongDeXuat[]
  const can = rows.filter((r) => r.muc_do <= 3)
  if (can.length === 0) return
  const khan = can.filter((r) => r.trang_thai === 'KHẨN').length
  await guiEmail({
    to: [ch.email_quan_ly_inn],
    subject: `${khan ? '[KHẨN] ' : ''}Kiểm kho ${MUC[muc].ten}: ${can.length} món cần đặt`,
    html: khung(
      `Kiểm kho ${MUC[muc].ten}`,
      doanVan(`${nguoi} vừa kiểm kho. Có ${can.length} món cần chú ý.`) + noiDungDatHang(rows, ch.ten_quan || 'LUK Inn SG'),
    ),
  })
}

export type KetQuaThietBi = {
  luot_id: string
  hanh_dong: 'Mượn' | 'Trả' | 'Chuyển chi nhánh'
  nguoi: string
  email: string | null
  han_tra?: string
  tinh_trang?: string
  chi_nhanh?: 'HN' | 'ĐN'
  nguoi_nhan?: string
  thiet_bi: { ma: string; ten: string; canh_bao: string | null; nguoi_giu?: string; email_nguoi_giu?: string | null }[]
}

/** Một email gộp cho cả lượt mượn / trả / chuyển (giống form cũ) */
export async function baoGiaoDichThietBi(sb: SupabaseClient, kq: KetQuaThietBi, ghiChu?: string) {
  const ch = await docCauHinh(sb)
  const n = kq.thiet_bi.length
  const coCanhBao = kq.thiet_bi.some((t) => t.canh_bao)
  let tieuDe = ''
  let moDau = ''
  if (kq.hanh_dong === 'Mượn') {
    tieuDe = `${kq.nguoi} mượn ${n} thiết bị, hạn trả ${ngayVN(kq.han_tra)}`
    moDau = `${kq.nguoi} đã mượn ${n} thiết bị. Hạn trả: ${ngayVN(kq.han_tra)}.`
  } else if (kq.hanh_dong === 'Trả') {
    tieuDe = `${kq.nguoi} trả ${n} thiết bị${kq.tinh_trang && kq.tinh_trang !== 'Bình thường' ? ` (báo ${kq.tinh_trang.toLowerCase()})` : ''}`
    moDau = `${kq.nguoi} đã trả ${n} thiết bị. Tình trạng: ${kq.tinh_trang}.`
  } else {
    const cn = kq.chi_nhanh === 'HN' ? 'Hà Nội' : 'Đà Nẵng'
    tieuDe = `Chuyển ${n} thiết bị ra ${cn}`
    moDau = `${kq.nguoi} đã chuyển ${n} thiết bị ra ${cn}. Người nhận: ${kq.nguoi_nhan}.`
  }
  const html = khung(
    tieuDe,
    doanVan(moDau) +
      (ghiChu ? doanVan(`Ghi chú: ${ghiChu}`) : '') +
      bang(['Mã', 'Thiết bị', 'Cảnh báo'], kq.thiet_bi.map((t) => [t.ma, t.ten, t.canh_bao ?? ''])),
  )
  const to = [kq.email, ...kq.thiet_bi.map((t) => t.email_nguoi_giu)]
  const cc = [ch.email_team_media, kq.hanh_dong === 'Chuyển chi nhánh' || coCanhBao ? ch.email_quan_ly_media : null]
  await guiEmail({ to, cc, subject: (coCanhBao ? '[Cảnh báo] ' : '') + tieuDe, html })
}
