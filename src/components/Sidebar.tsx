import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crown,
  Home,
  User,
  Settings,
  History,
  Users,
  BarChart3,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Megaphone
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<{
    name: string;
    memberId: string;
  } | null>(null);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!session?.user) {
        setUserProfile(null);
        return;
      }

      try {
        // Try to get user profile data
        const response = await fetch('/api/dashboard/data', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const { user: dbUser, profile } = result.data;
            
            // Generate member ID
            const memberId = dbUser?.id 
              ? `TRP-${dbUser.id.toString().slice(-6).padStart(3, '0')}` 
              : `TRP-${new Date().getFullYear()}-${String(session.user.id).slice(-3).toUpperCase()}`;

            // Get display name from profile or session
            let displayName = session.user.name || 'Member';
            if (profile?.firstName && profile?.lastName) {
              displayName = `${profile.firstName} ${profile.lastName}`;
            } else if (profile?.firstName) {
              displayName = profile.firstName;
            }

            setUserProfile({
              name: displayName,
              memberId: memberId
            });
          } else {
            // Fallback to session data
            setUserProfile({
              name: session.user.name || session.user.email?.split('@')[0] || 'Member',
              memberId: `TRP-${new Date().getFullYear()}-${String(session.user.id).slice(-3).toUpperCase()}`
            });
          }
        } else {
          // Fallback to session data
          setUserProfile({
            name: session.user.name || session.user.email?.split('@')[0] || 'Member',
            memberId: `TRP-${new Date().getFullYear()}-${String(session.user.id).slice(-3).toUpperCase()}`
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to session data
        setUserProfile({
          name: session.user.name || session.user.email?.split('@')[0] || 'Member',
          memberId: `TRP-${new Date().getFullYear()}-${String(session.user.id).slice(-3).toUpperCase()}`
        });
      }
    };

    loadUserProfile();
  }, [session]);

  const menuItems = [
    { path: "/dashboard", icon: Home, label: "Dashboard", badge: null },
    { path: "/dashboard/profile", icon: User, label: "Profile", badge: null },
    { path: "/dashboard/queue", icon: Users, label: "Home Solutions Queue", badge: "Live" },
    { path: "/dashboard/news", icon: Megaphone, label: "News & Updates", badge: "New" },
    { path: "/dashboard/analytics", icon: BarChart3, label: "Analytics", badge: null },
    { path: "/dashboard/history", icon: History, label: "History", badge: null },
    { path: "/dashboard/notifications", icon: Bell, label: "Notifications", badge: "3" },
    { path: "/dashboard/settings", icon: Settings, label: "Settings", badge: null },
    { path: "/dashboard/help", icon: HelpCircle, label: "Help & Support", badge: null },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return router.pathname === "/dashboard";
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={`bg-card border-r border-border shadow-2xl transition-all duration-300 ${
      isCollapsed ? "w-16" : "w-64"
    } flex flex-col h-screen sticky top-0`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-accent">
              <Crown className="w-6 h-6" />
              <span className="text-lg font-bold">Home Solutions</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-1 hover:bg-accent/10"
            data-cursor-sticky
            data-cursor-text={isCollapsed ? 'Expand' : 'Collapse'}
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
              data-cursor-sticky
              data-cursor-text={isCollapsed ? item.label : ''}
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
                <p className="text-sm font-medium truncate">
                  {userProfile?.name || session?.user?.name || session?.user?.email?.split('@')[0] || 'Member'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile?.memberId || `TRP-${new Date().getFullYear()}-${String(session?.user?.id || '000').slice(-3).toUpperCase()}`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
