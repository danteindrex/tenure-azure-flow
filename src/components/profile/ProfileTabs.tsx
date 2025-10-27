'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Shield, Settings } from "lucide-react"
import ProfileTab from "./ProfileTab"
import SecurityTab from "./SecurityTab"
import AccountTab from "./AccountTab"

export default function ProfileTabs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your account, security, and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
