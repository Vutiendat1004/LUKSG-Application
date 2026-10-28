import Link from 'next/link'
import { notFound } from 'next/navigation'
import { canNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, MUC_KEYS, laMuc } from '@/lib/muc'
import { truoc, so } from '@/lib/ngay'
import { CountForm, type MonDem } from './CountForm'

export const dynamic = 'force-dynamic'

export default async function KiemKho({ params }: { params: Promise<{ muc: string }> }) {
  const { muc } = await params
  if (!laMuc(muc)) notFound()
  await canNhom('inn')
  const sb = await supabaseServer()
  const { data } = await sb
    .from('v_de_xuat_dat_hang')
    .select('id, ten, don_vi, ton_dem, lan_dem, thu_tu')
    .eq('muc', muc)
    .order('thu_tu')
    .order('ten')

  const mon: MonDem[] = (data ?? []).map((r) => ({
    id: r.id,
    ten: r.ten,
    don_vi: r.don_vi,
    lan_truoc: r.ton_dem === null ? null : `${so(r.ton_dem)} ${r.don_vi} · ${truoc(r.lan_dem)}`,
  }))

  return (
    <main className="page">
      <Link href="/" className="back">‹ Trang chủ</Link>
      <h1>Kiểm kho</h1>
      <div className="seg" style={{ margin: '16px 0' }} role="tablist">
        {MUC_KEYS.map((m) => (
          <Link key={m} href={`/kiem-kho/${m}`} className={m === muc ? 'on' : ''} role="tab" aria-selected={m === muc}>
            {MUC[m].ten.replace(' & Logistic', '')}
          </Link>
        ))}
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Đếm số thực tế đang có trong kho rồi điền vào. Món nào không đếm thì để trống.
      </p>
      {mon.length === 0 ? (
        <div className="alert info">Mục này chưa có mặt hàng. Quản lý thêm ở Bảng quản lý → Danh mục.</div>
      ) : (
        <CountForm muc={muc} mon={mon} />
      )}
    </main>
  )
}
