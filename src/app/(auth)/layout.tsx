export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0d1a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#c9a84c' }}>
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
