'use client'

import { DefaultTemplate } from '@payloadcms/next/templates'
import React from 'react'
import ComplianceCenterClient from './ComplianceCenterClient'

export const ComplianceCenterView = ({
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
      <ComplianceCenterClient />
    </DefaultTemplate>
  )
}

export default ComplianceCenterView
