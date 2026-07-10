import { Card } from '@/components/ui/card'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { OtpForm } from './components/otp-form'

export default function Otp() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as { email?: string })?.email ?? ''

  // Guard: if no email in state, send back to forgot-password
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true })
  }, [email, navigate])

  return (
    <>
      <div className='auth-one-bg-position auth-one-bg' id='auth-particles'>
        <div className='bg-overlay' />
        <div className='shape'>
          <svg xmlns='http://www.w3.org/2000/svg' version='1.1' viewBox='0 0 1440 120' fill='#fff'>
            <path d='M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z' />
          </svg>
        </div>
      </div>
      <div className='container grid h-svh flex-col items-center justify-center bg-primary-foreground lg:max-w-none lg:px-0'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-2 sm:w-[480px] lg:p-8 z-10'>
          <div className='mb-4 flex items-center justify-center'>
            <img alt='Logo' className='rounded-md object-cover mx-auto' src='images/favicon.png' width='200' />
          </div>
          <Card className='p-6'>
            <div className='mb-4 flex flex-col space-y-1 text-left'>
              <h1 className='text-lg font-semibold tracking-tight'>Verify OTP</h1>
              <p className='text-sm text-muted-foreground'>
                Enter the 6-digit code sent to <span className='font-medium text-foreground'>{email}</span>
              </p>
            </div>
            <OtpForm email={email} />
            <p className='mt-4 text-center text-sm text-muted-foreground'>
              <Link to='/forgot-password' className='underline underline-offset-4 hover:text-primary'>
                ← Back
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
