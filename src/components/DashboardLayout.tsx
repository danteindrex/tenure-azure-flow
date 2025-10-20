import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, User, Sun } from "lucide-react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { logLogout } from "@/lib/audit";
import { useTheme } from "@/contexts/ThemeContext";
import Sidebar from "./Sidebar";

const DashboardLayout = ({ children }: { children?: React.ReactNode }) => {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const supabase = useSupabaseClient();
  const userData = useUser();
  const user = userData?.user;
  const { theme, setTheme, actualTheme } = useTheme();

  // Real user data
  const displayUserData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
    memberId: user?.user_metadata?.member_id || `TRP-${new Date().getFullYear()}-${String(user?.id || '').slice(-3).toUpperCase()}`,
  };

  const handleLogout = async () => {
    try {
      // Log logout before signing out
      if (user?.id) {
        await logLogout(user.id);
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.replace("/login");
    }
  };

  // Force light theme - no theme toggle
  const forceLight = () => {
    setTheme('light');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Sweep Animation on Load */}
        <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent sweep-line z-50" />

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/95 border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Page Title */}
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {displayUserData.name}</p>
              </div>

              {/* Light Theme Indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sun className="w-4 h-4" />
                <span className="hidden sm:inline">Light Mode</span>
              </div>

              {/* User Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 sm:gap-2 hover:bg-accent/10 p-2 sm:px-3"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  </div>
                  <span className="hidden sm:inline text-sm sm:text-base">{displayUserData.name}</span>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success pulse-glow" />
                </Button>

                {showProfileMenu && (
                  <Card className="absolute right-0 mt-2 w-40 sm:w-48 glass-card p-2 animate-fade-in">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 rounded-md text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
