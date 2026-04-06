import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DecoratedLabelProps {
  htmlFor?: string;
  icon: LucideIcon;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

interface DecoratedFieldShellProps {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}

export function DecoratedLabel({ htmlFor, icon: Icon, children, required = false, className }: DecoratedLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn('inline-flex items-center gap-2 text-sm font-medium text-foreground', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
        <Icon size={15} />
      </span>
      <span>
        {children}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
    </Label>
  );
}

export function DecoratedFieldShell({ icon: Icon, children, className, iconClassName }: DecoratedFieldShellProps) {
  return (
    <div className={cn('relative', className)}>
      <span className={cn('pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-secondary text-muted-foreground', iconClassName)}>
        <Icon size={15} />
      </span>
      {children}
    </div>
  );
}
