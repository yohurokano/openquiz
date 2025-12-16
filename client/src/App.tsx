import './App.css'
import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Host from './pages/Host'
import Join from './pages/Join'
import HostRoom from './pages/HostRoom'
import PlayRoom from './pages/PlayRoom'
import Editor from './pages/Editor'
import ThemeToggle from './components/ThemeToggle'
import { initTheme } from './lib/utils'

function App() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/host/:roomCode" element={<HostRoom />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/join" element={<Join />} />
        <Route path="/play/:roomCode" element={<PlayRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="appFooter">Created by Phoebeology</footer>
    </>
  )
}

export default App
