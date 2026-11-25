import { useState } from "react";
import { Menu } from "lucide-react";
import { AppProvider, useApp } from "./store/AppContext.jsx";
import { BRAND } from "./config/brand.js";
import Background from "./components/Background.jsx";
import LoginScreen, { PendingApprovalScreen, RequestDetailsScreen } from "./components/LoginScreen.jsx";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AnnouncementCarousel from "./components/AnnouncementCarousel.jsx";
import { Toasts } from "./components/ui.jsx";
import TasksBoard from "./components/TasksBoard.jsx";
import Schedule from "./components/Schedule.jsx";
import SuggestionBox from "./components/SuggestionBox.jsx";
import DailyReport from "./components/DailyReport.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import StudioHome from "./components/StudioHome.jsx";
import StudioWall from "./components/StudioWall.jsx";
import LeavePanel from "./components/LeavePanel.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Mascot from "./components/Mascot.jsx";

function Dashboard() {
  const { theme, can } = useApp();
  const dark = theme.mode === "dark";
  const [view, setView] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  const ADMIN_VIEW_PERMS = {
    "admin-tasks": "manageTasks",
    "admin-staff": "manageStaff",
    "admin-approvals": "manageStaff",
    "admin-announcements": "manageAnnouncements",
    "admin-suggestions": "viewSuggestions",
    "admin-reports": "viewReports",
    "admin-leave": "manageStaff",
    "admin-branding": "manageStaff",
  };

  const renderView = () => {
    switch (view) {
      case "home": return <StudioHome setView={setView} />;
      case "wall": return <StudioWall />;
      case "leave": return <LeavePanel />;
      case "leaderboard": return <Leaderboard />;
      case "tasks": return <TasksBoard />;
      case "schedule": return <Schedule />;
      case "suggestions": return <SuggestionBox />;
      case "report": return <DailyReport />;
      default:
        if (view.startsWith("admin-")) {
          const perm = ADMIN_VIEW_PERMS[view];
          if (!perm || !can(perm)) return <TasksBoard />;
          return <AdminPanel view={view} />;
        }
        return <TasksBoard />;
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <Background />
      <TopBar onGoTasks={() => setView("tasks")} />
      <div className="flex flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 gap-6">
        <Sidebar view={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1 min-w-0 scene-stage">
          {/* mobile nav button */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`lg:hidden flex items-center gap-2 mb-4 px-4 py-2.5 rounded-2xl border text-sm font-semibold ${
              dark ? "border-white/10 text-slate-200 bg-white/5" : "border-slate-200 text-slate-700 bg-white"
            }`}
          >
            <Menu size={16} /> Menu
          </button>
          <AnnouncementCarousel />
          {/* scene-cut transition on every view change */}
          <div key={view} className="anim-scene">
            {renderView()}
          </div>
          <footer className={`text-center text-xs mt-10 pb-4 ${dark ? "text-slate-600" : "text-slate-400"}`}>
            {BRAND.legalName} · {BRAND.portalDescriptor} · {BRAND.footerCredit}
          </footer>
        </main>
      </div>
      <Mascot />
    </div>
  );
}

function Shell() {
  const { session, currentUser, needsDetails, loading, theme } = useApp();
  const dark = theme.mode === "dark";

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Background />
        <div className={`flex flex-col items-center gap-4 text-sm font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <div className="film-reel anim-reel" />
          <span className="font-mono text-xs tracking-[.25em] uppercase">Loading workspace…</span>
        </div>
      </div>
    );
  }
  // Signed in with Google but no staff profile yet → approval gate
  if (session && !currentUser && needsDetails) return <RequestDetailsScreen />;
  if (session && !currentUser) return <PendingApprovalScreen />;
  if (!currentUser) return <LoginScreen />;
  return <Dashboard />;
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
      <Toasts />
    </AppProvider>
  );
}
