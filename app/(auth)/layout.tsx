import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--kk-bg)" }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex flex-col items-center gap-1 group">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-0.5"
              style={{ background: "var(--kk-green-light)" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M6 18C6 18 5 10 13 7C13 7 9 14 17 12"
                  stroke="#557B53"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 20C11 20 11 14 11 12"
                  stroke="#557B53"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-lora)", color: "var(--kk-dark)" }}
            >
              K-Kouman
            </span>
            <span className="text-xs" style={{ color: "var(--kk-muted)" }}>
              Votre bien-être, notre mission
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#fff",
            border: "1px solid var(--kk-border)",
            boxShadow: "0 12px 40px rgba(44,52,46,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
