// Simplified implementation to fix build issues
// Will restore full animate-ui functionality when dependency conflicts are resolved

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function TooltipArrow() {
  return null;
}

export function useTooltip() {
  return { open: false, setOpen: () => {} };
}

// Type exports for compatibility
export type TooltipProviderProps = any;
export type TooltipProps = any;
export type TooltipContentProps = any;
export type TooltipTriggerProps = any;
export type TooltipArrowProps = any;
export type TooltipPosition = any;
export type GlobalTooltipContextType = any;
export type TooltipContextType = any;
