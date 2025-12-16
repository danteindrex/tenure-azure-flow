'use client'

import { Suspense } from 'react';
import TwoFactorSetup from '@/components/pages/TwoFactorSetup';

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TwoFactorSetup />
    </Suspense>
  );
}
