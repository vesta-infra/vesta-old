'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  error?: string;
}

interface SelectItemData {
  value: string;
  label: string;
}

function Select({ value, onValueChange, placeholder = 'Select...', children, className, disabled, error }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const items = React.useMemo(() => {
    const result: SelectItemData[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<SelectItemProps>(child) && child.props.value) {
        result.push({ value: child.props.value, label: (child.props.children as string) || child.props.value });
      }
    });
    return result;
  }, [children]);

  const selectedLabel = items.find((i) => i.value === value)?.label;

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={cn('relative w-full', className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      >
        <span className={cn(!selectedLabel && 'text-muted-foreground')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg animate-slide-down">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement<SelectItemProps>(child)) return child;
            return React.cloneElement(child, {
              selected: child.props.value === value,
              onSelect: () => {
                onValueChange?.(child.props.value);
                setOpen(false);
              },
            });
          })}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  selected?: boolean;
  onSelect?: () => void;
}

function SelectItem({ className, children, selected, onSelect, ...props }: SelectItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        selected && 'bg-accent/50',
        className,
      )}
      onClick={onSelect}
      role="option"
      aria-selected={selected}
      {...props}
    >
      <span className="flex-1">{children}</span>
      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
    </div>
  );
}

export { Select, SelectItem };
