
import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root className={cn('checkbox flex items-center justify-center', className)} {...props}>
      <CheckboxPrimitive.Indicator>✔</CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
export default Checkbox
