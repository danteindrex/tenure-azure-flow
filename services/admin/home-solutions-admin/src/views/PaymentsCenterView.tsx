'use client'

import { DefaultTemplate } from '@payloadcms/next/templates'
import React from 'react'
import PaymentsCenterClient from './PaymentsCenterClient'

export const PaymentsCenterView = ({
  initPageResult,
  params,
  searchParams,
}: any) => {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <PaymentsCenterClient />
    </DefaultTemplate>
  )
}

export default PaymentsCenterView
