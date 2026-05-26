import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DailyLog from "./pages/DailyLog";
import DayDetail from "./pages/DayDetail";
import FoodDatabase from "./pages/FoodDatabase";
import Profile from "./pages/Profile";
import { LayoutDashboard, CalendarDays, Database, User } from "lucide-react";

function NavigationLayout() {
  const location = useLocation();
  
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/log", label: "Logs", icon: CalendarDays },
    { to: "/database", label: "Food DB", icon: Database },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-4 space-y-6">
        <h1 className="text-xl font-bold text-primary tracking-tight px-2">NutriTrack</h1>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content View Port */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<DailyLog />} />
          <Route path="/log/:date" element={<DayDetail />} />
          <Route path="/database" element={<FoodDatabase />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border flex justify-around py-2 px-4 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationLayout />
    </BrowserRouter>
  );
}
