import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Sidebar } from '../components/layout/Sidebar';
import { Catalog } from '../components/dashboard/Catalog';
import { Fonte } from '../components/dashboard/Fonte';
import { Library } from '../components/dashboard/Library';
import { Downloads } from '../components/dashboard/Downloads';
import { SocialFeed } from '../components/social/SocialFeed';
import { PostDetail } from '../components/social/PostDetail';
import { UserProfile } from '../components/social/UserProfile';
import { TitleBar } from '../components/ui/TitleBar';

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState('social');
  const [previousSection, setPreviousSection] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored) setUsername(stored);
    window.ipc?.send('window-enter-dashboard', null);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.ipc?.send('window-enter-login', null);
    router.push('/home');
  };

  const handleNavigate = (section: string) => {
    router.push(section === 'profile' ? '/dashboard?profile=me' : '/dashboard', undefined, { shallow: true });
    setPreviousSection(activeSection);
    setActiveSection(section === 'profile' ? 'social' : section);
  };

  const handleGoBack = () => {
    if (!previousSection) return;
    setActiveSection(previousSection);
    setPreviousSection(null);
  };

  const renderContent = () => {
    if (typeof router.query.post === 'string') {
      const id = Number(router.query.post);
      return Number.isSafeInteger(id) && id > 0 ? <PostDetail key={`post-${id}`} id={id} username={username} /> : <p className="p-8">Invalid post.</p>;
    }
    if (typeof router.query.profile === 'string') {
      const target = router.query.profile;
      return target === 'me' || /^[1-9]\d*$/.test(target) ? <UserProfile key={`profile-${target}`} target={target} username={username} /> : <p className="p-8">Invalid profile.</p>;
    }
    switch (activeSection) {
      case 'social':
        return <SocialFeed username={username || 'Player'} />;
      case 'catalog':
        return <Catalog onGoBack={previousSection ? handleGoBack : undefined} />;
      case 'library':
        return <Library />;
      case 'fonte':
        return <Fonte />;
      case 'downloads':
        return <Downloads />;
      case 'profile':
        return <UserProfile target="me" username={username} />;
      case 'settings':
        return (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-500">Settings — Coming soon</p>
          </div>
        );
      default:
        return <SocialFeed username={username || 'Player'} />;
    }
  };

  const sectionTitle = router.query.post ? 'Post' : router.query.profile ? 'Profile' : activeSection.charAt(0).toUpperCase() + activeSection.slice(1);

  return (
    <>
      <Head>
        <title>{`Vault - ${sectionTitle}`}</title>
      </Head>

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background-dark">
        <TitleBar />
        <div
          className="flex min-h-0 w-full flex-1 text-white"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Sidebar
            activeSection={router.query.profile ? 'profile' : router.query.post ? 'social' : activeSection}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            username={username}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          />
          {renderContent()}
        </div>
      </div>
    </>
  );
}
