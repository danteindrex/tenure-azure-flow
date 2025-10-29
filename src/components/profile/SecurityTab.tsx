'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import TwoFactorManager from "@/components/security/TwoFactorManager"
import PasskeyManager from "@/components/security/PasskeyManager"

export default function SecurityTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication methods
          </CardDescription>
        </CardHeader>
      </Card>

      <TwoFactorManager />
      <PasskeyManager />
    </div>
  )
}