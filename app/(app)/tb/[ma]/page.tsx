import Link from 'next/link'
import { canNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { lopTrangThaiTB } from '@/lib/muc'
import { ngayVN, gioVN, tien, homNay } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

/** Trang mở ra khi quét QR dán trên thiết bị bằng camera điện thoại */
export default async function TrangThietBi({ params }: { params: Promise<{ ma: string }> }) {
  const nv = await canNhom('media')
  const ma = decodeURIComponent((await params).ma).toUpperCase()
  const sb = await supabaseServer()
  const [{ data: t }, { data: ls }] = await Promise.all([
    sb.from('thiet_bi').select('*').eq('ma', ma).maybeSingle(),
    sb.from('giao_dich').select('id, thoi_diem, hanh_dong, nguoi_ten, canh_bao, tinh_trang, chi_nhanh').eq('ma_thiet_bi', ma).order('thoi_diem', { ascending: false }).limit(8),
  ])

  if (!t) {
    return (
      <main className="page">
        <Link href="/thiet-bi" className="back">‹ Thiết bị</Link>
        <div className="alert err">Không có thiết bị mã {ma}.</div>
      </main>
    )
  }
  const cuaToi = t.trang_thai === 'Đang mượn' && t.nguoi_giu_id === nv.id
  const muonDuoc = ['Trong kho', 'Đang mượn', 'Cần kiểm tra'].includes(t.trang_thai)
  const traDuoc = ['Trong kho', 'Đang mượn', 'Cần kiểm tra'].includes(t.trang_thai)
  const quaHan = t.trang_thai === 'Đang mượn' && t.han_tra && t.han_tra < homNay()

  return (
    <main className="page">
      <Link href="/thiet-bi" className="back">‹ Thiết bị</Link>
      <div className="device-head">
        <span className="code">{t.ma}</span>
        <h1>{t.ten}</h1>
        <div><span className={lopTrangThaiTB(t.trang_thai)}>{t.trang_thai}</span>{quaHan && <span className="pill khan" style={{ marginLeft: 6 }}>Quá hạn</span>}</div>
      </div>

      <dl className="kv card" style={{ marginTop: 16 }}>
        {t.trang_thai === 'Đang mượn' && (
          <>
            <dt>Người giữ</dt><dd>{t.nguoi_giu_ten}{cuaToi ? ' (bạn)' : ''}</dd>
            <dt>Hạn trả</dt><dd>{ngayVN(t.han_tra)}</dd>
          </>
        )}
        {t.serial && (<><dt>Serial</dt><dd>{t.serial}</dd></>)}
        {t.gia_tri && (<><dt>Giá trị</dt><dd>{tien(t.gia_tri)}</dd></>)}
        {t.ghi_chu && (<><dt>Ghi chú</dt><dd>{t.ghi_chu}</dd></>)}
      </dl>

      <div className="stack" style={{ marginTop: 16 }}>
        {cuaToi ? (
          <Link href={`/thiet-bi?hd=tra&ma=${encodeURIComponent(t.ma)}`} className="btn media block">Trả thiết bị này</Link>
        ) : muonDuoc ? (
          <Link href={`/thiet-bi?hd=muon&ma=${encodeURIComponent(t.ma)}`} className="btn media block">Mượn thiết bị này</Link>
        ) : (
          <div className="alert warn">Thiết bị đang “{t.trang_thai}” nên không mượn được.</div>
        )}
        {!cuaToi && traDuoc && t.trang_thai === 'Đang mượn' && (
          <Link href={`/thiet-bi?hd=tra&ma=${encodeURIComponent(t.ma)}`} className="btn block">Trả hộ {t.nguoi_giu_ten}</Link>
        )}
      </div>

      <div className="section-head"><h2>Lịch sử gần đây</h2></div>
      {(ls ?? []).length === 0 ? (
        <p className="muted">Chưa có lượt nào.</p>
      ) : (
        <ul className="list">
          {(ls ?? []).map((g) => (
            <li key={g.id}>
              <div className="row">
                <b>{g.hanh_dong}{g.chi_nhanh ? ` ${g.chi_nhanh}` : ''}</b>
                <span>{g.nguoi_ten}</span>
                <span className="spacer" />
                <span className="small muted">{gioVN(g.thoi_diem)}</span>
              </div>
              {(g.canh_bao || (g.tinh_trang && g.tinh_trang !== 'Bình thường')) && (
                <div className="small" style={{ color: 'var(--dat)' }}>{g.canh_bao ?? g.tinh_trang}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
