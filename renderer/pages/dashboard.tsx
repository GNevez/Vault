import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppTopBar, type AppModule } from '../components/layout/AppTopBar';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { GamesWorkspace } from '../components/dashboard/GamesWorkspace';
import type { GamesTab } from '../components/dashboard/gameUi';
import { SocialFeed } from '../components/social/SocialFeed';
import { PostDetail } from '../components/social/PostDetail';
import { UserProfile } from '../components/social/UserProfile';
import { VoiceProvider, useVoice } from '../components/servers/VoiceProvider';
import { ServersWorkspace } from '../components/servers/ServersWorkspace';
import { ServerManager } from '../components/servers/ServerDialog';
import { useServerDetail, useServers } from '../hooks/useServers';
import { SettingsWorkspace, isSettingsTab } from '../components/settings/SettingsWorkspace';
import { applyZoom } from '../lib/app-settings';
import { clearSession } from '../lib/session';

const GAMES_TABS: GamesTab[] = ['catalog', 'library', 'downloads', 'fonte'];
const SIDEBAR_KEY = 'vault.sidebarCollapsed';
const TITLES: Record<AppModule, string> = { community: 'Comunidade', games: 'Games', servers: 'Servidores' };

export default function DashboardPage() {
  return <VoiceProvider><DashboardContent /></VoiceProvider>;
}

function DashboardContent() {
  const [username, setUsername] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusedServer, setFocusedServer] = useState<number>();
  const router = useRouter();
  const { voice, engine } = useVoice();
  const serverList = useServers();
  const [serverManager, setServerManager] = useState<'create' | 'join' | null>(null);
  const parsedServer = Number(router.query.server);
  const serverId = Number.isSafeInteger(parsedServer) && parsedServer > 0 ? parsedServer : undefined;
  const parsedText = Number(router.query.text);
  const textChannelId = Number.isSafeInteger(parsedText) && parsedText > 0 ? parsedText : undefined;
  const activeSection = router.query.profile || router.query.post ? 'social' : serverId ? 'servers' : typeof router.query.section === 'string' ? router.query.section : 'social';
  const gamesTab = GAMES_TABS.find(tab => tab === activeSection);
  const activeModule: AppModule | null = gamesTab ? 'games' : activeSection === 'servers' ? 'servers' : activeSection === 'settings' ? null : 'community';

  // The side panel lists channels for the open server, else the last one picked, the active call's, or the first.
  const known = (id?: number) => (id && serverList.servers.some(s => s.id === id) ? id : undefined);
  const panelServerId = serverId ?? known(focusedServer) ?? known(voice.session?.serverId) ?? serverList.servers[0]?.id;
  const panelServer = useServerDetail(panelServerId);
  // Servidores always shows a server: the one in the URL or the one selected in the side panel.
  const openServerId = activeModule === 'servers' ? serverId ?? panelServerId : undefined;

  useEffect(() => {
    const stored = localStorage.getItem('username');
    if (stored) setUsername(stored);
    try { setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1'); } catch {}
    window.ipc?.send('window-enter-dashboard', null);
    applyZoom();
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(value => {
    try { localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1'); } catch {}
    return !value;
  });

  const handleLogout = async () => {
    await engine.disconnect();
    clearSession();
    window.ipc?.send('window-enter-login', null);
    router.push('/home');
  };

  const handleNavigate = (section: string) => {
    router.push({ pathname: '/dashboard', query: section === 'profile' ? { profile: 'me' } : section === 'social' ? {} : { section } }, undefined, { shallow: true });
  };

  const selectServer = (id?: number, text?: number) => {
    if (id) setFocusedServer(id);
    return router.push({ pathname: '/dashboard', query: id ? { server: id, ...(text ? { text } : {}) } : { section: 'servers' } }, undefined, { shallow: true });
  };

  const handleServerRemoved = async () => {
    setFocusedServer(undefined);
    await serverList.refresh();
    if (activeModule === 'servers') await selectServer();
  };

  const focusServer = (id: number) => {
    setFocusedServer(id);
    if (activeModule === 'servers') void selectServer(id);
  };

  const renderContent = () => {
    if (typeof router.query.post === 'string') {
      const id = Number(router.query.post);
      return Number.isSafeInteger(id) && id > 0 ? <PostDetail key={`post-${id}`} id={id} username={username} /> : <p className="p-8 text-sm text-zinc-500">Post inválido.</p>;
    }
    if (typeof router.query.profile === 'string') {
      const target = router.query.profile;
      return target === 'me' || /^[1-9]\d*$/.test(target) ? <UserProfile key={`profile-${target}`} target={target} username={username} /> : <p className="p-8 text-sm text-zinc-500">Perfil inválido.</p>;
    }
    if (gamesTab) return <GamesWorkspace tab={gamesTab} onTab={handleNavigate} />;
    switch (activeSection) {
      case 'servers':
        return <ServersWorkspace serverId={openServerId} textChannelId={textChannelId} username={username} hasServers={serverList.servers.length > 0} listLoading={serverList.loading} listError={serverList.error} refreshServers={serverList.refresh} server={openServerId ? panelServer.server : null} error={openServerId ? panelServer.error : ''} reload={panelServer.reload} onManage={setServerManager} />;
      case 'profile':
        return <UserProfile target="me" username={username} />;
      case 'settings':
        return <SettingsWorkspace
          tab={isSettingsTab(router.query.tab) ? router.query.tab : 'account'}
          onTab={tab => void router.push({ pathname: '/dashboard', query: { section: 'settings', tab } }, undefined, { shallow: true })}
          onViewProfile={() => handleNavigate('profile')}
          onLogout={() => void handleLogout()}
        />;
      default:
        return <SocialFeed username={username || 'Player'} />;
    }
  };

  const sectionTitle = router.query.post ? 'Post' : router.query.profile ? 'Perfil' : activeModule ? TITLES[activeModule] : 'Configurações';

  return (
    <>
      <Head>
        <title>{`VAULT · ${sectionTitle}`}</title>
      </Head>

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background-dark text-white">
        <AppTopBar active={activeModule} username={username} inVoice={!!voice.session} onNavigate={handleNavigate} onLogout={() => void handleLogout()} />
        <div className="flex min-h-0 w-full flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <ServerSidebar
            username={username}
            servers={serverList.servers}
            loading={serverList.loading}
            error={serverList.error}
            focusedId={panelServerId}
            detail={panelServer.server}
            detailError={panelServer.error}
            routeServerId={openServerId}
            textChannelId={textChannelId}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            onFocus={focusServer}
            onOpen={(id, channel) => void selectServer(id, channel)}
            onManage={setServerManager}
            onChanged={panelServer.reload}
            onRemoved={handleServerRemoved}
          />
          <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{renderContent()}</main>
        </div>
      </div>
      {serverManager && <ServerManager mode={serverManager} onClose={() => setServerManager(null)} onComplete={id => { setServerManager(null); void serverList.refresh(); void selectServer(id); }} />}
    </>
  );
}
