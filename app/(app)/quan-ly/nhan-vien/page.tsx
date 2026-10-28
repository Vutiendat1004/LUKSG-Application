import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ngayVN, homNay } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'
import { taoNhanVien, suaNhanVien, datLaiMatKhau } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NhanVienPage({ searchParams }: { searchParams: SP }) {
  const toi = await canQuanLy()
  const sp = await searchParams
  const sb = await supabaseServer()
  const { data } = await sb.from('nhan_vien').select('*').order('dang_lam', { ascending: false }).order('ho_ten')

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Nhân viên</h1>
      <ThongBao ok={sp.ok} loi={sp.loi} />

      <details className="card" style={{ marginTop: 16 }} open={(data ?? []).length <= 1}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 18 }}>Thêm nhân viên</summary>
        <form action={taoNhanVien} className="stack" style={{ marginTop: 14 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="ho_ten">Họ tên</label><input id="ho_ten" name="ho_ten" className="input" required /></div>
            <div className="field">
              <label htmlFor="tdn">Tên đăng nhập</label>
              <input id="tdn" name="ten_dang_nhap" className="input" autoCapitalize="none" placeholder="vd: lan, khang.vo" required />
            </div>
            <div className="field">
              <label htmlFor="mk">Mật khẩu ban đầu</label>
              <input id="mk" name="mat_khau" className="input" minLength={6} placeholder="Ít nhất 6 ký tự" required />
            </div>
            <div className="field">
              <label htmlFor="em">Email nhận thông báo</label>
              <input id="em" name="email" type="email" className="input" placeholder="Để nhận email mượn trả, nhắc hạn" />
            </div>
          </div>
          <div className="row">
            <label className="row"><input type="checkbox" name="nhom_inn" style={{ width: 22, height: 22 }} /> Nhóm LUK Inn</label>
            <label className="row"><input type="checkbox" name="nhom_media" style={{ width: 22, height: 22 }} /> Nhóm Media</label>
            <select name="vai_tro" className="input" style={{ width: 'auto' }} defaultValue="nhan_vien" aria-label="Vai trò">
              <option value="nhan_vien">Nhân viên</option>
              <option value="quan_ly">Quản lý (thấy tất cả)</option>
            </select>
          </div>
          <div><button className="btn primary">Tạo tài khoản</button></div>
        </form>
      </details>

      <div className="section-head"><h2>Danh sách</h2><span className="tag">{(data ?? []).filter((x) => x.dang_lam).length} đang làm</span></div>
      <div className="stack">
        {(data ?? []).map((x) => (
          <div key={x.id} className="card stack" style={x.dang_lam ? undefined : { opacity: 0.6 }}>
            <form action={suaNhanVien} className="stack">
              <input type="hidden" name="id" value={x.id} />
              <div className="row">
                <b style={{ fontSize: 18 }}>{x.ho_ten}</b>
                <span className="muted">@{x.ten_dang_nhap}</span>
                {x.id === toi.id && <span className="pill xam">Bạn</span>}
                {x.khoa_muon_den && x.khoa_muon_den >= homNay() && <span className="pill dat">Khoá mượn đến {ngayVN(x.khoa_muon_den)}</span>}
              </div>
              <div className="grid2">
                <input name="ho_ten" defaultValue={x.ho_ten} className="input sm" aria-label="Họ tên" />
                <input name="email" type="email" defaultValue={x.email ?? ''} className="input sm" placeholder="Email nhận thông báo" aria-label="Email" />
              </div>
              <div className="row">
                <label className="row"><input type="checkbox" name="nhom_inn" defaultChecked={x.nhom.includes('inn')} /> Inn</label>
                <label className="row"><input type="checkbox" name="nhom_media" defaultChecked={x.nhom.includes('media')} /> Media</label>
                <select name="vai_tro" defaultValue={x.vai_tro} className="input sm" style={{ width: 'auto' }} aria-label="Vai trò">
                  <option value="nhan_vien">Nhân viên</option>
                  <option value="quan_ly">Quản lý</option>
                </select>
                <label className="row"><input type="checkbox" name="dang_lam" defaultChecked={x.dang_lam} /> Đang làm</label>
                <span className="spacer" />
                <button className="btn sm">Lưu</button>
              </div>
            </form>
            <form action={datLaiMatKhau} className="row">
              <input type="hidden" name="id" value={x.id} />
              <input name="mat_khau" className="input sm" style={{ maxWidth: 220 }} placeholder="Mật khẩu mới" minLength={6} aria-label="Mật khẩu mới" />
              <button className="btn sm ghost">Đặt lại mật khẩu</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  )
}
