import { Hexagon } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-primary)_0%,_transparent_50%)] opacity-[0.07]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-primary)_0%,_transparent_50%)] opacity-[0.04]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 h-80 w-80 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/5">
            <Hexagon className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Vesta
          </h1>
          <p className="text-sm text-muted-foreground">
            Self-hosted platform as a service
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
