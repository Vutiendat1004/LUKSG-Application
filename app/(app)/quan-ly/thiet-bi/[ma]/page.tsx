import Link from 'next/link'
import { notFound } from 'next/navigation'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { lopTrangThaiTB } from '@/lib/muc'
import { ngayVN, gioVN } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuThietBi, doiTrangThaiTB } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function SuaThietBi({ params, searchParams }: { params: Promise<{ ma: string }>; searchParams: SP }) {
  await canQuanLy()
  const ma = decodeURIComponent((await params).ma).toUpperCase()
  const sp = await searchParams
  const moi = ma === 'MOI'
  const sb = await supabaseServer()
  const [{ data: t }, { data: loai }, { data: ls }] = await Promise.all([
    moi ? Promise.resolve({ data: null }) : sb.from('thiet_bi').select('*').eq('ma', ma).maybeSingle(),
    sb.from('loai_thiet_bi').select('ma_goc, ten').order('ma_goc'),
    moi ? Promise.resolve({ data: [] }) : sb.from('giao_dich').select('id, thoi_diem, hanh_dong, nguoi_ten, canh_bao, chi_nhanh, nguoi_nhan, tinh_trang, ghi_chu').eq('ma_thiet_bi', ma).order('thoi_diem', { ascending: false }).limit(30),
  ])
  if (!moi && !t) notFound()
  const v = (k: string) => (t && t[k] !== null && t[k] !== undefined ? String(t[k]) : '')

  return (
    <main className="page">
      <Link href="/quan-ly/thiet-bi" className="back">‹ Thiết bị</Link>
      <h1>{moi ? 'Thêm thiết bị' : `${t!.ma} · ${t!.ten}`}</h1>
      <ThongBao ok={sp.ok} loi={sp.loi} />

      {!moi && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <div className="row">
            <span className={lopTrangThaiTB(t!.trang_thai)}>{t!.trang_thai}</span>
            {t!.trang_thai === 'Đang mượn' && <span>{t!.nguoi_giu_ten} · hạn {ngayVN(t!.han_tra)}</span>}
          </div>
          <form action={doiTrangThaiTB} className="stack">
            <input type="hidden" name="ma" value={t!.ma} />
            <div className="grid2">
              <div className="field">
                <label htmlFor="tt">Đổi trạng thái</label>
                <select id="tt" name="trang_thai" className="input" defaultValue="">
                  <option value="" disabled>Chọn…</option>
                  {['Trong kho', 'Cần kiểm tra', 'Cần sửa chữa', 'Đã chuyển HN', 'Đã chuyển ĐN'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ld">Lý do / lỗi (ghi vào ghi chú)</label>
                <input id="ld" name="ly_do" className="input" placeholder="Vd: hỏng AF" />
              </div>
            </div>
            <p className="small muted">“Cần sửa chữa” tự mở phiếu sửa. Đổi về “Trong kho” tự đóng phiếu. Mượn/trả bình thường thì dùng màn hình Thiết bị, không đổi ở đây.</p>
            <button className="btn">Đổi trạng thái</button>
          </form>
        </div>
      )}

      <form action={luuThietBi} className="stack" style={{ marginTop: 16 }}>
        {!moi && <input type="hidden" name="ma_cu" value={t!.ma} />}
        <div className="grid2">
          <div className="field"><label htmlFor="ma">Mã</label><input id="ma" name="ma" className="input" defaultValue={v('ma')} placeholder="EQ013-07" required /></div>
          <div className="field">
            <label htmlFor="ma_goc">Mã gốc (loại)</label>
            <input id="ma_goc" name="ma_goc" className="input" list="ds-loai" defaultValue={v('ma_goc')} placeholder="Để trống = lấy phần trước dấu gạch" />
            <datalist id="ds-loai">{(loai ?? []).map((l) => <option key={l.ma_goc} value={l.ma_goc}>{l.ten}</option>)}</datalist>
          </div>
        </div>
        <div className="field"><label htmlFor="ten">Tên</label><input id="ten" name="ten" className="input" defaultValue={v('ten')} required /></div>
        {moi && <div className="field"><label htmlFor="ten_loai">Tên loại (nếu là mã gốc mới)</label><input id="ten_loai" name="ten_loai" className="input" /></div>}
        <div className="grid2">
          <div className="field"><label htmlFor="serial">Serial</label><input id="serial" name="serial" className="input" defaultValue={v('serial')} /></div>
          <div className="field"><label htmlFor="gia_tri">Giá trị (đ)</label><input id="gia_tri" name="gia_tri" className="input" inputMode="numeric" defaultValue={v('gia_tri')} /></div>
        </div>
        <div className="field"><label htmlFor="ghi_chu">Ghi chú</label><textarea id="ghi_chu" name="ghi_chu" className="input" defaultValue={v('ghi_chu')} /></div>
        <button className="btn media block">{moi ? 'Thêm thiết bị' : 'Lưu thông tin'}</button>
      </form>

      {!moi && (
        <>
          <div className="section-head"><h2>Lịch sử</h2><Link href={`/tb/${encodeURIComponent(t!.ma)}`} className="tag">Trang của thiết bị</Link></div>
          <ul className="list">
            {(ls ?? []).map((g) => (
              <li key={g.id}>
                <div className="row"><b>{g.hanh_dong}{g.chi_nhanh ? ` ${g.chi_nhanh}` : ''}</b><span>{g.nguoi_ten}</span><span className="spacer" /><span className="small muted">{gioVN(g.thoi_diem)}</span></div>
                {[g.canh_bao, g.nguoi_nhan && `Người nhận: ${g.nguoi_nhan}`, g.ghi_chu].filter(Boolean).map((x) => <div key={String(x)} className="small muted">{x}</div>)}
              </li>
            ))}
            {(ls ?? []).length === 0 && <li className="muted">Chưa có lượt nào.</li>}
          </ul>
        </>
      )}
    </main>
  )
}
