import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { homNay } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

export default async function QuanLy() {
  await canQuanLy()
  const sb = await supabaseServer()
  const [dx, qh, sc, ck] = await Promise.all([
    sb.from('v_de_xuat_dat_hang').select('muc_do').lte('muc_do', 3),
    sb.from('thiet_bi').select('ma', { count: 'exact', head: true }).eq('trang_thai', 'Đang mượn').lt('han_tra', homNay()),
    sb.from('sua_chua').select('id', { count: 'exact', head: true }).in('tinh_trang', ['Chờ sửa', 'Đang sửa']),
    sb.from('thiet_bi').select('ma', { count: 'exact', head: true }).eq('trang_thai', 'Cần kiểm tra'),
  ])
  const khan = (dx.data ?? []).filter((r) => r.muc_do === 1).length
  const canDat = (dx.data ?? []).length

  const o = (href: string, t: string, d: string, lop: string, k?: { text: string; cls: string } | null) => (
    <Link href={href} className={`tile ${lop}`}>
      <span className="t">{t}</span>
      <span className="d">{d}</span>
      {k && <span className={`k ${k.cls}`}>{k.text}</span>}
    </Link>
  )

  return (
    <main className="page wide">
      <Link href="/" className="back">‹ Trang chủ</Link>
      <h1>Bảng quản lý</h1>

      <div className="section-head"><h2>LUK Inn</h2></div>
      <div className="ql-grid">
        {o('/quan-ly/dat-hang', 'Đặt hàng', 'Món cần đặt, tin nhắn cho NCC', 'inn',
          canDat ? { text: khan ? `${khan} khẩn` : `${canDat} món`, cls: khan ? 'bad' : 'due' } : null)}
        {o('/quan-ly/danh-muc', 'Danh mục', 'Mặt hàng, nhà cung cấp, thông số đặt', 'inn')}
        {o('/quan-ly/kiem-kho', 'Nhật ký kho', 'Các lần kiểm kho và nhập hàng', 'inn')}
        {o('/quan-ly/dinh-muc', 'Định mức', 'Lượng dùng theo công thức và thực tế', 'inn')}
      </div>

      <div className="section-head"><h2>Media SG</h2></div>
      <div className="ql-grid">
        {o('/quan-ly/thiet-bi', 'Thiết bị', 'Danh sách, đổi trạng thái, thêm mới', 'media',
          (qh.count ?? 0) > 0 ? { text: `${qh.count} quá hạn`, cls: 'bad' } : (ck.count ?? 0) > 0 ? { text: `${ck.count} cần kiểm tra`, cls: 'due' } : null)}
        {o('/quan-ly/ton-kho', 'Tồn kho thiết bị', 'Theo loại: số chuẩn, đã chuyển, chưa rõ', 'media')}
        {o('/quan-ly/sua-chua', 'Sửa chữa', 'Phiếu sửa, nơi sửa, chi phí', 'media',
          (sc.count ?? 0) > 0 ? { text: `${sc.count} đang mở`, cls: 'info' } : null)}
        {o('/quan-ly/lich-su', 'Lịch sử mượn trả', 'Mọi lượt mượn, trả, chuyển', 'media')}
        {o('/quan-ly/vi-pham', 'Vi phạm', 'Quá hạn, trả trễ, mở khoá quyền mượn', 'media')}
      </div>

      <div className="section-head"><h2>Chung</h2></div>
      <div className="ql-grid">
        {o('/quan-ly/nhan-vien', 'Nhân viên', 'Tài khoản, nhóm, đặt lại mật khẩu', 'ql')}
        {o('/quan-ly/in-qr', 'In mã QR', 'QR thiết bị và QR dán kho', 'ql')}
        {o('/quan-ly/cau-hinh', 'Cấu hình', 'Email nhận, ngày kiểm, hệ số mùa vụ', 'ql')}
      </div>
    </main>
  )
}
