import * as React from 'react'
type Option = { value: string, label: string }
type Props = { value: string, onValueChange: (v:string)=>void, options: Option[], className?: string }
export function Select({ value, onValueChange, options, className='' }: Props) {
  return (
    <select
      value={value}
      onChange={(e)=>onValueChange(e.target.value)}
      className={`h-8 px-2 rounded-lg border border-slate-300 bg-white text-sm ${className}`}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
