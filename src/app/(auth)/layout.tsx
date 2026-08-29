export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-full overflow-hidden bg-background text-on-surface">{children}</div>;
}
