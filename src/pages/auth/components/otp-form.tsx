import { HTMLAttributes, useState } from 'react'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/custom/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import { PinInput, PinInputField } from '@/components/custom/pin-input'
import { Separator } from '@/components/ui/separator'
import api from '@/api/client'

interface OtpFormProps extends HTMLAttributes<HTMLDivElement> {
  email: string
}

const formSchema = z.object({
  otp: z.string().length(6, { message: 'Please enter the 6-digit OTP.' }),
})

export function OtpForm({ className, email, ...props }: OtpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [disabledBtn, setDisabledBtn] = useState(true)
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await api.post('/auth/verify-otp', { email, otp: data.otp })
      toast({ title: 'OTP verified', description: 'Now set your new password.' })
      navigate('/reset-password', { state: { email, otp: data.otp } })
    } catch (e: any) {
      toast({
        title: 'Invalid OTP',
        description: e?.response?.data?.error || 'OTP is incorrect or expired.',
        variant: 'destructive',
      })
      form.reset()
      setDisabledBtn(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid gap-3'>
            <FormField
              control={form.control}
              name='otp'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>6-digit OTP</FormLabel>
                  <FormControl>
                    <PinInput
                      {...field}
                      className='flex h-10 justify-between'
                      onComplete={() => setDisabledBtn(false)}
                      onIncomplete={() => setDisabledBtn(true)}
                    >
                      {Array.from({ length: 7 }, (_, i) => {
                        if (i === 3) return <Separator key={i} orientation='vertical' />
                        return (
                          <PinInputField
                            key={i}
                            component={Input}
                            className={form.getFieldState('otp').invalid ? 'border-red-500' : ''}
                          />
                        )
                      })}
                    </PinInput>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='mt-2' disabled={disabledBtn} loading={isLoading}>
              Verify OTP
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
