import Link from 'next/link'
import { layNhanVien } from '@/lib/auth'
import { dangXuat } from '../dang-nhap/actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const nv = await layNhanVien()
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <img src="/logo.png" alt="" className="brand-mark" />
            LUK SG
          </Link>
          <span className="spacer" />
          <span className="who">{nv.ho_ten}</span>
          <form action={dangXuat}>
            <button className="btn sm ghost" type="submit">Thoát</button>
          </form>
        </div>
      </header>
      {children}
    </>
  )
}
