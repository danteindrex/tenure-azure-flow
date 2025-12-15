'use client'

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, FileText } from "lucide-react";
import SessionsManagement from "./SessionsManagement";
import AuditLog from "./AuditLog";

export default function SecurityMonitoring() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("sessions");

  useEffect(() => {
    // Set initial tab based on route
    if (pathname === "/audit") {
      setActiveTab("audit");
    } else {
      setActiveTab("sessions");
    }
  }, [pathname]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-10 w-10" />
          Security & Monitoring
        </h1>
        <p className="text-muted-foreground">
          Monitor admin sessions and track system events.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Admin Sessions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <SessionsManagement />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
