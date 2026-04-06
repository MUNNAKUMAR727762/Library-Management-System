import { BookOpen, Lightbulb } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function Logo({ size = 'md', showTagline = false }: LogoProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 36 : 28;
  const textClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <BookOpen className="text-primary" size={iconSize} strokeWidth={2.2} />
        <Lightbulb className="absolute -top-1 -right-1 text-accent" size={iconSize * 0.45} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className={`font-bold tracking-tight text-foreground ${textClass}`}>
          Gyan Sthal
        </span>
        {showTagline && (
          <span className="text-xs text-muted-foreground">A Place for Focused Learning</span>
        )}
      </div>
    </div>
  );
}
