import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import LoginPage from './features/auth/LoginPage';
import LandingPage from './features/landing/LandingPage';
import DashboardPage from './features/dashboard/DashboardPage';
import RelationshipExplorer from './features/graph/RelationshipExplorer';
import ProjectExplorer from './features/projects/ProjectExplorer';
import CapabilityMatrix from './features/capabilities/CapabilityMatrix';
import CredentialFinder from './features/credentials/CredentialFinder';
import WhyUsReport from './features/report/WhyUsReport';
import EntityProfilePage from './features/entity/EntityProfilePage';
import ExportCenter from './features/exports/ExportCenter';
import DataQualityPage from './features/data-quality/DataQualityPage';
import DatabaseManagerPage from './features/database-manager/DatabaseManagerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="copilot" element={<LandingPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="explorer" element={<RelationshipExplorer />} />
          <Route path="projects" element={<ProjectExplorer />} />
          <Route path="capability-matrix" element={<CapabilityMatrix />} />
          <Route path="credentials" element={<CredentialFinder />} />
          <Route path="report" element={<WhyUsReport />} />
          <Route path="entity/:type/:id" element={<EntityProfilePage />} />
          <Route path="exports" element={<ExportCenter />} />
          <Route path="data-quality" element={<DataQualityPage />} />
          <Route path="database-manager" element={<DatabaseManagerPage />} />
        </Route>

        {/* Fallback to Overview */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
