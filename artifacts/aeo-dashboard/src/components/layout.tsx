import { useState } from "react";
import { Link, useRoute } from "wouter";
import { LayoutDashboard, Target, Zap, LayoutPanelLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function NavItem({ href, icon: Icon, children, onClick }: { href: string, icon: any, children: React.ReactNode, onClick?: () => void }) {
  const [isActive] = useRoute(href === '/' ? '/' : `${href}/*`);
  
  return (
    <Link 
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
        isActive 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  return (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-white font-display font-bold text-xl leading-tight">AEO Scope</h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Analytics Platform</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        <NavItem href="/" icon={LayoutDashboard} onClick={onNav}>Campaigns</NavItem>
        <NavItem href="/campaigns/new" icon={Target} onClick={onNav}>New Analysis</NavItem>
      </nav>
      
      <div className="p-6 border-t border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-slate-300 font-bold text-sm">US</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">Demo User</p>
            <p className="text-xs text-slate-500 truncate">demo@aeoscope.io</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-slate-950 border-r border-slate-900 flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-900 flex flex-col transition-transform duration-300 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent onNav={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-4 sm:px-8 gap-4">
          <button
            className="md:hidden text-slate-500 hover:text-slate-900 p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center text-slate-500 text-sm font-medium">
            <LayoutPanelLeft className="w-4 h-4 mr-2" />
            Workspace / Analytics
          </div>
        </header>
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
