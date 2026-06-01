export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center px-4 overflow-y-auto overflow-x-hidden"
      style={{
        backgroundColor: '#0a0d1a',
        minHeight: '100dvh',
        paddingTop: 'max(2rem, env(safe-area-inset-top, 2rem))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold" style={{ color: '#c9a84c' }}>
            Plan B Rentable
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            par Coach Redouane
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
