import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--kk-bg)" }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <Logo variant="full" layout="vertical" size={64} />
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
