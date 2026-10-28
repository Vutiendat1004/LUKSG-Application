import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ngayVN, homNay } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'
import { moKhoaMuon, xoaViPham } from '../actions'

export const dynamic = 'force-dynamic'

export default async function ViPham({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const sb = await supabaseServer()
  const [{ data }, { data: khoa }] = await Promise.all([
    sb.from('vi_pham').select('*').order('ngay', { ascending: false }).limit(200),
    sb.from('nhan_vien').select('id, ho_ten, khoa_muon_den').gte('khoa_muon_den', homNay()),
  ])

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Vi phạm</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Bậc tính theo số lần quá hạn hoặc trả trễ trong khoảng ngày ở Cấu hình: 1 nhắc nhở, 2 tạm mất quyền tự mượn, 3 báo cáo cấp trên xử lý theo nội quy. Không phạt tiền.
      </p>
      <ThongBao ok={sp.ok} loi={sp.loi} />

      {(khoa ?? []).length > 0 && (
        <>
          <div className="section-head"><h2>Đang tạm mất quyền tự mượn</h2></div>
          <ul className="list">
            {(khoa ?? []).map((k) => (
              <li key={k.id} className="row">
                <b>{k.ho_ten}</b><span className="muted">đến {ngayVN(k.khoa_muon_den)}</span><span className="spacer" />
                <form action={moKhoaMuon}><input type="hidden" name="id" value={k.id} /><button className="btn sm">Mở khoá</button></form>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="section-head"><h2>Ghi nhận</h2></div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Ngày</th><th>Người</th><th>Mã</th><th>Loại</th><th className="num">Số ngày</th><th className="num">Lần</th><th>Xử lý</th><th>Ghi chú</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((v) => (
              <tr key={v.id}>
                <td className="nowrap">{ngayVN(v.ngay)}</td>
                <td>{v.nguoi_ten}</td>
                <td className="nowrap">{v.ma_thiet_bi}</td>
                <td>{v.loai}</td>
                <td className="num">{v.so_ngay}</td>
                <td className="num">{v.lan_thu}</td>
                <td className="small">{v.xu_ly}</td>
                <td className="small">{v.ghi_chu}</td>
                <td><form action={xoaViPham}><input type="hidden" name="id" value={v.id} /><button className="btn sm ghost" title="Xoá ghi nhận nhầm">Xoá</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
