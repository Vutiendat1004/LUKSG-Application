import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ngayVN, tien } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuSuaChua } from '../actions'

export const dynamic = 'force-dynamic'

export default async function SuaChua({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const tatCa = sp.xem === 'tat-ca'
  const sb = await supabaseServer()
  let q = sb.from('sua_chua').select('*, thiet_bi(ten)').order('ngay_bao', { ascending: false })
  if (!tatCa) q = q.in('tinh_trang', ['Chờ sửa', 'Đang sửa'])
  const { data } = await q
  const ds = data ?? []
  const chiPhi = ds.reduce((s, r) => s + (Number(r.chi_phi) || 0), 0)

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Sửa chữa</h1>
      <ThongBao ok={sp.ok} loi={sp.loi} />
      <div className="filters" style={{ margin: '16px 0' }}>
        <Link href="/quan-ly/sua-chua" className={!tatCa ? 'on' : ''}>Đang mở</Link>
        <Link href="/quan-ly/sua-chua?xem=tat-ca" className={tatCa ? 'on' : ''}>Tất cả</Link>
      </div>
      <p className="small muted" style={{ marginBottom: 10 }}>
        {ds.length} phiếu{chiPhi ? ` · chi phí ${tien(chiPhi)}` : ''}. Chọn “Đã xong” thì thiết bị tự về “Trong kho”. Mở phiếu mới bằng cách đổi trạng thái thiết bị sang “Cần sửa chữa”.
      </p>
      <div className="stack">
        {ds.map((r) => (
          <form key={r.id} action={luuSuaChua} className="card stack">
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <Link href={`/quan-ly/thiet-bi/${encodeURIComponent(r.ma_thiet_bi)}`}><b>{r.ma_thiet_bi}</b></Link>
              <span>{(r.thiet_bi as { ten: string } | null)?.ten}</span>
              <span className="spacer" />
              <span className="small muted">Báo {ngayVN(r.ngay_bao)}</span>
            </div>
            <div className="grid2">
              <div className="field"><label>Lỗi</label><input name="loi" defaultValue={r.loi ?? ''} className="input sm" /></div>
              <div className="field"><label>Nơi sửa</label><input name="noi_sua" defaultValue={r.noi_sua ?? ''} className="input sm" /></div>
              <div className="field"><label>Chi phí (đ)</label><input name="chi_phi" defaultValue={r.chi_phi ?? ''} className="input sm" inputMode="numeric" /></div>
              <div className="field">
                <label>Tình trạng</label>
                <select name="tinh_trang" defaultValue={r.tinh_trang} className="input sm">
                  {['Chờ sửa', 'Đang sửa', 'Đã xong', 'Không sửa được'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="field"><label>Ngày xong</label><input type="date" name="ngay_xong" defaultValue={r.ngay_xong ?? ''} className="input sm" /></div>
              <div className="field"><label>Ghi chú</label><input name="ghi_chu" defaultValue={r.ghi_chu ?? ''} className="input sm" /></div>
            </div>
            <div><button className="btn sm">Lưu phiếu</button></div>
          </form>
        ))}
        {ds.length === 0 && <p className="muted">Không có phiếu nào.</p>}
      </div>
    </main>
  )
}
