import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ControlsPage from './pages/ControlsPage'
import CoverageDashboardPage from './pages/CoverageDashboardPage'
import TestsPage from './pages/TestsPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/controls" replace />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/coverage" element={<CoverageDashboardPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/issues" element={<div className="p-8">Issues - Coming Soon</div>} />
          <Route path="/fs-line-items" element={<div className="p-8">Financial Statements - Coming Soon</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
