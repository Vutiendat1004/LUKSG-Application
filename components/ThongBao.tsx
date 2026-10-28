export function ThongBao({ ok, loi }: { ok?: string; loi?: string }) {
  if (!ok && !loi) return null
  return (
    <div className={`alert ${loi ? 'err' : 'ok'}`} role="status" style={{ margin: '12px 0' }}>
      {loi || ok}
    </div>
  )
}

export type SP = Promise<{ ok?: string; loi?: string; [k: string]: string | undefined }>
