import { LoginForm } from './LoginForm'

export const metadata = { title: 'Đăng nhập · LUK SG' }

export default async function DangNhap({ searchParams }: { searchParams: Promise<{ tiep?: string; loi?: string }> }) {
  const sp = await searchParams
  return (
    <main className="login">
      <div className="login-card">
        <img src="/logo.png" alt="LUK Global" className="login-mark" />
        <h1>Vào làm việc</h1>
        <p className="muted" style={{ marginTop: 6 }}>Kiểm kho LUK Inn và mượn trả thiết bị Media SG.</p>
        <div className="login-split" aria-hidden><span /><span /></div>
        {sp.loi === 'chua-cap-quyen' && (
          <div className="alert warn" style={{ marginBottom: 14 }}>
            Tài khoản này chưa được cấp quyền hoặc đã ngừng hoạt động. Nhờ quản lý kiểm tra.
          </div>
        )}
        <LoginForm tiep={sp.tiep && sp.tiep.startsWith('/') ? sp.tiep : '/'} />
      </div>
    </main>
  )
}
