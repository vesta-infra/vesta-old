import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted bg-[length:200%_100%] bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
