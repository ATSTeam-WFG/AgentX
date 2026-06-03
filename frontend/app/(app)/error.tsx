'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#06090f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      gap: '12px',
      fontFamily: 'DM Sans, sans-serif',
      textAlign: 'center',
    }}>
      <p style={{ margin: 0, fontSize: '15px', color: '#f1f5f9', fontWeight: 500 }}>
        Something went wrong
      </p>
      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            color: '#f1f5f9',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/home')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Go home
        </button>
      </div>
    </div>
  )
}
