import * as React from 'react'
type Props = { value: string, onValueChange: (v:string)=>void, children: React.ReactNode }
export function Tabs({ value, onValueChange, children }: Props) {
  return <div data-value={value}>{children}</div>
}
export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex rounded-2xl border bg-white p-1">{children}</div>
}
export function TabsTrigger({ value, activeValue, onClick, children }:{ value:string, activeValue:string, onClick:()=>void, children:React.ReactNode }) {
  const active = value===activeValue
  return (
    <button onClick={onClick}
      className={`px-3 h-9 rounded-xl text-sm border ${active?'bg-sky-600 text-white border-sky-700':'bg-transparent text-slate-700 border-transparent hover:bg-slate-50'}`}>
      {children}
    </button>
  )
}
export function TabsContent({ value, activeValue, children }:{ value:string, activeValue:string, children:React.ReactNode }) {
  if (value !== activeValue) return null
  return <div>{children}</div>
}
