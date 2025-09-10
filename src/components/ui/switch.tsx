import * as React from 'react'
type Props = { id?: string, checked?: boolean, onCheckedChange?: (v:boolean)=>void }
export function Switch({ id, checked=false, onCheckedChange }: Props) {
  return (
    <button
      id={id}
      onClick={()=>onCheckedChange && onCheckedChange(!checked)}
      aria-pressed={checked}
      className={`h-6 w-11 rounded-full border transition relative ${checked?'bg-sky-600 border-sky-700':'bg-white border-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked?'translate-x-5':''}`} />
    </button>
  )
}
