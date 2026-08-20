import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { PapersPage } from './pages/PapersPage';
import { PaperDetailPage } from './pages/PaperDetailPage';
import { ChatPage } from './pages/ChatPage';
import { ComparePage } from './pages/ComparePage';
import { InsightsPage } from './pages/InsightsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/papers" element={<PapersPage />} />
        <Route path="/papers/:id" element={<PaperDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
