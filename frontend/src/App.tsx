import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ExamsPage } from './pages/ExamsPage';
import { GroupsPage } from './pages/GroupsPage';
import { RoomsPage } from './pages/RoomsPage';
import { ConfigPage } from './pages/ConfigPage';
import { GeneratePage } from './pages/GeneratePage';
import { TimetableViewerPage } from './pages/TimetableViewerPage';
import { ValidationPage } from './pages/ValidationPage';
import { ExplainPage } from './pages/ExplainPage';
import { api } from './services/api';
import { DashboardStats, Timetable } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentTimetable, setCurrentTimetable] = useState<Timetable | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await api.getDashboardStats();
      setStats(data);
      if (data.latest_timetable && !currentTimetable) {
        setCurrentTimetable(data.latest_timetable);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTimetableGenerated = (tt: Timetable) => {
    setCurrentTimetable(tt);
    fetchStats();
  };

  const handleTimetableUpdated = (tt: Timetable) => {
    setCurrentTimetable(tt);
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        onRefresh={fetchStats}
        activeTimetableValid={currentTimetable ? currentTimetable.is_valid : undefined}
      />

      {/* Main Body */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          hardViolationCount={stats ? stats.hard_violations : 0}
        />

        {/* Content Pane */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              stats={stats}
              loading={loadingStats}
              onNavigate={setCurrentTab}
              onSelectTimetable={setCurrentTimetable}
            />
          )}

          {currentTab === 'exams' && <ExamsPage />}
          {currentTab === 'groups' && <GroupsPage />}
          {currentTab === 'rooms' && <RoomsPage />}
          {currentTab === 'config' && <ConfigPage />}

          {currentTab === 'generate' && (
            <GeneratePage
              onGenerated={handleTimetableGenerated}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'viewer' && (
            <TimetableViewerPage
              currentTimetable={currentTimetable}
              onTimetableUpdated={handleTimetableUpdated}
            />
          )}

          {currentTab === 'validation' && (
            <ValidationPage
              currentTimetable={currentTimetable}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'explain' && (
            <ExplainPage currentTimetable={currentTimetable} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
