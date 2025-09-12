
import React from 'react'
import { cn } from '@/lib/utils'

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('alert border-slate-200', className)} {...props} />
}
export function AlertTitle(props: React.HTMLAttributes<HTMLDivElement>) { return <div className='font-semibold' {...props} /> }
export function AlertDescription(props: React.HTMLAttributes<HTMLDivElement>) { return <div className='text-sm text-slate-600' {...props} /> }
export default Alert
