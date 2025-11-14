import Link from "next/link";
import { useRouter } from "next/router";
import { Home, User, Users, Settings } from "lucide-react";

const MobileBottomNav = () => {
  const router = useRouter();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/dashboard/queue", icon: Users, label: "Queue" },
    { path: "/dashboard/profile", icon: User, label: "Profile" },
    { path: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return router.pathname === "/dashboard";
    }
    return router.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                active
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? "text-accent" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium truncate ${active ? "text-accent" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
