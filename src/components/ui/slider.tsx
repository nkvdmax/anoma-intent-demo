
import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export function Slider({ className, ...props }: SliderPrimitive.SliderProps) {
  return (
    <SliderPrimitive.Root className={cn('relative flex items-center select-none touch-none h-5', className)} {...props}>
      <SliderPrimitive.Track className='bg-slate-200 relative grow rounded-full h-1'>
        <SliderPrimitive.Range className='absolute h-full bg-slate-400 rounded-full'/>
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className='block w-4 h-4 bg-white border border-slate-300 rounded-full shadow' />
    </SliderPrimitive.Root>
  )
}
export default Slider
