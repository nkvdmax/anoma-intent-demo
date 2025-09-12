
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export function Select({ children, ...props }: SelectPrimitive.SelectProps) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
}
export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} className={cn('select-trigger', className)} {...props} />
  )
)
export function SelectContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Content className={cn('bg-white border rounded-xl shadow p-1', className)} {...props} />
}
export function SelectItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item className={cn('px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer', className)} {...props} />
}
export function SelectValue(props: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />
}
export default Select
