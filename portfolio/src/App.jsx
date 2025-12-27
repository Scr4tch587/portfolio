import Layout from './components/Layout'
import { PlayerProvider } from './context/PlayerContext'
import Home from './pages/Home'

function App() {
  return (
    <PlayerProvider>
      <Layout>
        <Home />
      </Layout>
    </PlayerProvider>
  )
}

export default App
