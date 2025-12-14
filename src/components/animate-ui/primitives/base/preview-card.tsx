'use client';

import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;
const HoverCardContent = HoverCardPrimitive.Content;

export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
};

// For compatibility, alias as PreviewCard
export const PreviewCard = HoverCard;
export const PreviewCardTrigger = HoverCardTrigger;
export const PreviewCardContent = HoverCardContent;
