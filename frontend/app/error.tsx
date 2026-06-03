'use client'
import { useEffect } from 'react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root-error]', error)
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
      <button
        onClick={reset}
        style={{
          marginTop: '8px',
          padding: '10px 28px',
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
    </div>
  )
}
