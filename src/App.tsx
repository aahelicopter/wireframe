import { BrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <div className="flex items-center justify-center h-full">
          <h1 className="text-6xl font-bold">SoxHub</h1>
        </div>
      </Layout>
    </BrowserRouter>
  )
}

export default App
