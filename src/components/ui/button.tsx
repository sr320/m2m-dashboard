import * as React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline', size?: 'sm'|'md'|'lg' }
export function Button({ className='', variant='default', size='md', ...props }: Props) {
  const base = 'inline-flex items-center justify-center rounded-2xl font-medium transition border'
  const sizes = { sm:'h-8 px-3 text-sm', md:'h-10 px-4', lg:'h-12 px-6 text-lg' }
  const variants = {
    default: 'bg-sky-600 text-white border-sky-700 hover:bg-sky-700',
    outline: 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
  }
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
}
