import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ControlsPage from './pages/ControlsPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/controls" replace />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/coverage" element={<div className="p-8">Coverage Dashboard - Coming Soon</div>} />
          <Route path="/tests" element={<div className="p-8">Tests - Coming Soon</div>} />
          <Route path="/issues" element={<div className="p-8">Issues - Coming Soon</div>} />
          <Route path="/fs-line-items" element={<div className="p-8">Financial Statements - Coming Soon</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
