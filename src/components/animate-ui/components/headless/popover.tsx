import * as React from 'react';
import { Popover as BasePopover } from '@base-ui-components/react/popover';
import { cn } from '@/lib/utils';

// Correct Base UI Popover API implementation
export function PopoverRoot({ children, ...props }: any) {
  return <BasePopover.Root {...props}>{children}</BasePopover.Root>;
}

export function PopoverTrigger({ children, ...props }: any) {
  return <BasePopover.Trigger {...props}>{children}</BasePopover.Trigger>;
}

export function PopoverPortal({ children, ...props }: any) {
  return <BasePopover.Portal {...props}>{children}</BasePopover.Portal>;
}

export function PopoverPositioner({ children, ...props }: any) {
  return <BasePopover.Positioner {...props}>{children}</BasePopover.Positioner>;
}

export function PopoverPopup({ className, children, ...props }: any) {
  return (
    <BasePopover.Popup
      className={cn(
        'absolute z-50 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </BasePopover.Popup>
  );
}

export function PopoverArrow({ className, ...props }: any) {
  return <BasePopover.Arrow className={cn('fill-popover', className)} {...props} />;
}

// Legacy API compatibility - map old names to new ones
export const Popover = PopoverRoot;
export const PopoverButton = PopoverTrigger;
export const PopoverPanel = PopoverPopup;
export const PopoverBackdrop = () => null; // Not used in Base UI
export const PopoverGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
