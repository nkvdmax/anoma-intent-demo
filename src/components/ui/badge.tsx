
import React from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default'|'secondary'|'outline' }) {
  const variant = (props as any).variant || 'default'
  const base = {
    default: 'badge border-slate-200 bg-white',
    secondary: 'badge border-slate-200 bg-slate-100',
    outline: 'badge border-slate-300 bg-transparent'
  }[variant]
  return <span className={cn(base, className)} {...props} />
}
export default Badge
