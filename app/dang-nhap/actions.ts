'use server'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { emailDangNhap } from '@/lib/auth'

export async function dangNhap(_prev: { loi: string }, form: FormData): Promise<{ loi: string }> {
  const ten = String(form.get('ten') ?? '').trim().toLowerCase()
  const mk = String(form.get('mk') ?? '')
  const tiep = String(form.get('tiep') ?? '/')
  if (!ten || !mk) return { loi: 'Nhập tên đăng nhập và mật khẩu.' }
  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email: emailDangNhap(ten), password: mk })
  if (error) return { loi: 'Sai tên đăng nhập hoặc mật khẩu.' }
  redirect(tiep.startsWith('/') ? tiep : '/')
}

export async function dangXuat() {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/dang-nhap')
}
