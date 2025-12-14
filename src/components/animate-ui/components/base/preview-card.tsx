import * as React from 'react';
import { cn } from '@/lib/utils';

// Simplified PreviewCard as a basic card component
const PreviewCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-md border bg-card text-card-foreground shadow-sm', className)}
    {...props}
  />
));
PreviewCard.displayName = 'PreviewCard';

const PreviewCardTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn('inline-flex items-center justify-center', className)}
    {...props}
  />
));
PreviewCardTrigger.displayName = 'PreviewCardTrigger';

const PreviewCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md',
      className
    )}
    {...props}
  />
));
PreviewCardContent.displayName = 'PreviewCardContent';

export {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardContent,
};
