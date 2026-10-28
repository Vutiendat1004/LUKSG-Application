'use client'
import { useActionState } from 'react'
import { dangNhap } from './actions'

export function LoginForm({ tiep }: { tiep: string }) {
  const [state, action, pending] = useActionState(dangNhap, { loi: '' })
  return (
    <form action={action} className="stack">
      <input type="hidden" name="tiep" value={tiep} />
      <div className="field">
        <label htmlFor="ten">Tên đăng nhập hoặc email</label>
        <input id="ten" name="ten" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
      </div>
      <div className="field">
        <label htmlFor="mk">Mật khẩu</label>
        <input id="mk" name="mk" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state.loi && <div className="alert err" role="alert">{state.loi}</div>}
      <button className="btn primary block" disabled={pending}>
        {pending ? 'Đang vào…' : 'Đăng nhập'}
      </button>
      <p className="small muted">Quên mật khẩu? Nhờ quản lý đặt lại trong mục Nhân viên.</p>
    </form>
  )
}
