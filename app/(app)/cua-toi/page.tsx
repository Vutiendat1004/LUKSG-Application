import Link from 'next/link'
import { canNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ngayVN, homNay } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

export default async function CuaToi() {
  const nv = await canNhom('media')
  const sb = await supabaseServer()
  const [{ data }, { data: vp }] = await Promise.all([
    sb.from('thiet_bi').select('ma, ten, han_tra, ngay_muon').eq('trang_thai', 'Đang mượn').eq('nguoi_giu_id', nv.id).order('han_tra'),
    sb.from('vi_pham').select('id, ngay, ma_thiet_bi, loai, so_ngay, xu_ly').eq('nguoi_id', nv.id).order('ngay', { ascending: false }).limit(5),
  ])
  const ds = data ?? []
  const hn = homNay()

  return (
    <main className="page">
      <Link href="/" className="back">‹ Trang chủ</Link>
      <h1>Đồ tôi đang giữ</h1>
      <p className="muted" style={{ margin: '6px 0 16px' }}>{ds.length ? `${ds.length} thiết bị` : 'Bạn không giữ thiết bị nào.'}</p>

      {ds.length > 0 && (
        <>
          <ul className="list">
            {ds.map((t) => {
              const qua = t.han_tra && t.han_tra < hn
              const homnay = t.han_tra === hn
              return (
                <li key={t.ma}>
                  <Link href={`/tb/${encodeURIComponent(t.ma)}`} className="item">
                    <span style={{ flex: 1 }}>
                      <b>{t.ten}</b>
                      <div className="small muted">{t.ma} · mượn {ngayVN(t.ngay_muon)}</div>
                    </span>
                    <span className={`pill ${qua ? 'khan' : homnay ? 'dat' : 'media'}`}>
                      {qua ? `Quá hạn ${ngayVN(t.han_tra)}` : homnay ? 'Hạn hôm nay' : `Hạn ${ngayVN(t.han_tra)}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div style={{ marginTop: 16 }}>
            <Link href={`/thiet-bi?hd=tra&ma=${ds.map((t) => encodeURIComponent(t.ma)).join(',')}`} className="btn media block">
              Trả tất cả {ds.length} thiết bị
            </Link>
          </div>
        </>
      )}

      {(vp ?? []).length > 0 && (
        <>
          <div className="section-head"><h2>Ghi nhận vi phạm gần đây</h2></div>
          <ul className="list">
            {(vp ?? []).map((v) => (
              <li key={v.id}>
                <div className="row"><b>{v.loai}</b><span>{v.ma_thiet_bi}</span><span className="spacer" /><span className="small muted">{ngayVN(v.ngay)}</span></div>
                {v.xu_ly && <div className="small muted">{v.xu_ly}{v.so_ngay ? ` · ${v.so_ngay} ngày` : ''}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
