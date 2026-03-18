import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Sidebar } from '../components/layout/Sidebar'
import { Catalog } from '../components/dashboard/Catalog'
import { Fonte } from "../components/dashboard/Fonte";
import { Library } from "../components/dashboard/Library";
import { Downloads } from "../components/dashboard/Downloads";
import { TitleBar } from "../components/ui/TitleBar";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("catalog");
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
    (window as any).ipc.send("window-enter-dashboard");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    (window as any).ipc.send("window-enter-login");
    router.push("/home");
  };

  const handleNavigate = (section: string) => {
    setPreviousSection(activeSection);
    setActiveSection(section);
  };

  const handleGoBack = () => {
    if (previousSection) {
      setActiveSection(previousSection);
      setPreviousSection(null);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "catalog":
        return (
          <Catalog onGoBack={previousSection ? handleGoBack : undefined} />
        );
      case "library":
        return <Library />;
      case "fonte":
        return <Fonte />;
      case "downloads":
        return <Downloads />;
      case "profile":
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Profile — Coming soon</p>
          </div>
        );
      case "settings":
        return (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-500">Settings — Coming soon</p>
          </div>
        );
      default:
        return <Catalog />;
    }
  };

  return (
    <>
      <Head>
        <title>
          Vault —{" "}
          {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
        </title>
      </Head>

      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background-dark">
        <TitleBar />
        <div
          className="flex flex-1 min-h-0 w-full text-white"
          style={{ WebkitAppRegion: "no-drag" } as any}
        >
          <Sidebar
            activeSection={activeSection}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            username={username}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          {renderContent()}
        </div>
      </div>
    </>
  );
}
