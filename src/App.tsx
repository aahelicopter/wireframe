import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ControlsPage from './pages/ControlsPage'
import CoverageDashboardPage from './pages/CoverageDashboardPage'
import TestsPage from './pages/TestsPage'
import IssuesPage from './pages/IssuesPage'
import FSLineItemsPage from './pages/FSLineItemsPage'
import FSLineItemDetailPage from './pages/FSLineItemDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/controls" replace />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/coverage" element={<CoverageDashboardPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/fs-line-items" element={<FSLineItemsPage />} />
          <Route path="/fs-line-items/:id" element={<FSLineItemDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
