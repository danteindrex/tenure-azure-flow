import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crown,
  Home,
  User,
  Settings,
  CreditCard,
  History,
  Users,
  BarChart3,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Shield
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const router = useRouter();

  const menuItems = [
    { path: "/dashboard", icon: Home, label: "Dashboard", badge: null },
    { path: "/dashboard/profile", icon: User, label: "Profile", badge: null },
    { path: "/dashboard/transactions", icon: CreditCard, label: "Transactions", badge: null },
    { path: "/dashboard/queue", icon: Users, label: "Tenure Queue", badge: "Live" },
    { path: "/dashboard/analytics", icon: BarChart3, label: "Analytics", badge: null },
    { path: "/dashboard/history", icon: History, label: "History", badge: null },
    { path: "/dashboard/notifications", icon: Bell, label: "Notifications", badge: "3" },
    { path: "/dashboard/settings", icon: Settings, label: "Settings", badge: null },
    { path: "/dashboard/help", icon: HelpCircle, label: "Help & Support", badge: null },
    { path: "/dashboard/users", icon: Users, label: "Users", badge: "Live" },
    { path: "/dashboard/audit-logs", icon: Shield, label: "Audit Logs", badge: "Admin" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return router.pathname === "/dashboard";
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={`bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    } flex flex-col h-screen sticky top-0`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-accent">
              <Crown className="w-6 h-6" />
              <span className="text-lg font-bold">Tenure</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-1 hover:bg-accent/10"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.badge === "Live"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-accent/20 text-accent"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <Card className="p-3 bg-background/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">TRP-2024-001</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
