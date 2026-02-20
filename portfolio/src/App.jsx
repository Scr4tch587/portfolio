import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import { PlayerProvider } from './context/PlayerContext'
import Home from './pages/Home'

const ENABLE_MOBILE_UNSUPPORTED_PAGE = true

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
}

function App() {
  const [showMobileUnsupported, setShowMobileUnsupported] = useState(false)

  useEffect(() => {
    if (!ENABLE_MOBILE_UNSUPPORTED_PAGE) return
    setShowMobileUnsupported(isMobileDevice())
  }, [])

  if (showMobileUnsupported) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-black tracking-tight mb-4">Desktop Only (For Now)</h1>
          <p className="text-gray-300 text-base leading-relaxed">
            This portfolio experience is not yet supported on mobile devices.
            Please visit on desktop for the full interactive version.
          </p>
        </div>
      </div>
    )
  }

  return (
    <PlayerProvider>
      <Layout>
        <Home />
      </Layout>
    </PlayerProvider>
  )
}

export default App
