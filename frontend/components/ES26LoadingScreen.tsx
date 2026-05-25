'use client';

interface Props {
  label?: string;
}

export default function ES26LoadingScreen({ label = 'Loading…' }: Props) {
  return (
    <>
      <style>{`
        .es26-ls {
          position: absolute; inset: 0;
          background: #1C283C;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 28px; z-index: 10;
        }
        .es26-ls-logo {
          width: 96px; border-radius: 16px;
          box-shadow: 0 0 48px rgba(227,149,72,.18);
          animation: es26Breath 2.4s ease-in-out infinite;
        }
        @keyframes es26Breath {
          0%, 100% { opacity: .92; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .es26-ls-label {
          font-family: 'Sora', sans-serif;
          font-size: 15px; font-weight: 600;
          color: rgba(204,222,231,.55); letter-spacing: .02em;
        }
        .es26-ls-dots { display: flex; gap: 8px; }
        .es26-ls-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #E39548;
          animation: es26DotPulse 1.2s ease-in-out infinite;
        }
        .es26-ls-dot:nth-child(1) { animation-delay: 0s; }
        .es26-ls-dot:nth-child(2) { animation-delay: .3s; }
        .es26-ls-dot:nth-child(3) { animation-delay: .6s; }
        @keyframes es26DotPulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
      <div className="es26-ls">
        <img src="/ES26logo.png" alt="ES26" className="es26-ls-logo" />
        <div className="es26-ls-label">{label}</div>
        <div className="es26-ls-dots">
          <div className="es26-ls-dot" />
          <div className="es26-ls-dot" />
          <div className="es26-ls-dot" />
        </div>
      </div>
    </>
  );
}
