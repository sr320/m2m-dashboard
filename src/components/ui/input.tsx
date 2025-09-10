import * as React from 'react'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 w-full rounded-xl border border-slate-300 px-3 outline-none focus:ring-2 focus:ring-sky-200 ${props.className||''}`} />
}
