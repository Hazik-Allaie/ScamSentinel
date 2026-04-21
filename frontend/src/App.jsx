import React, { Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, Link, useLocation } from 'react-router-dom';
import { Scan } from './pages/Scan';
import { Intercept } from './pages/Intercept';
import { Feed } from './pages/Feed';
import { Landing } from './pages/Landing';

// Global error boundary to catch any uncaught errors gracefully
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#10131a] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/5">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-display font-black uppercase tracking-tighter text-white mb-2">System Error</h1>
            <p className="text-white/40 text-sm mb-6">A critical error occurred. Please reload the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-display font-black text-xs uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-body selection:bg-[var(--color-primary)] selection:text-[var(--color-on-primary)]">
      {/* Background scanline effect overlay — lowered z-index so it doesn't block interactions */}
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] z-[1]"></div>
      
      {/* Navigation Bar — refined glassmorphism */}
      <header className="bg-[rgba(16,19,26,0.65)] backdrop-blur-2xl border-b border-white/[0.06] sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="font-display font-black text-xl uppercase tracking-tighter text-[var(--color-primary)] group-hover:drop-shadow-[0_0_8px_rgba(0,218,243,0.5)] transition-all">
                ScamSentinel
              </div>
            </Link>
            
            <nav className="hidden lg:flex space-x-8">
              {[
                { to: '/', label: 'THREAT MAP', end: true },
                { to: '/scan', label: 'SCANNER' },
                { to: '/intercept', label: 'VAULT' },
                { to: '/feed', label: 'INTEL FEED' }
              ].map(item => (
                <NavLink 
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `
                    text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative py-2
                    ${isActive 
                      ? 'text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-[var(--color-primary)] after:shadow-[0_0_8px_var(--color-primary)]' 
                      : 'text-white/40 hover:text-white/80'}
                  `}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <details className="relative">
                <summary className="list-none cursor-pointer p-2 text-white/40 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </summary>
                <div className="absolute right-0 top-12 w-56 bg-[rgba(16,19,26,0.95)] backdrop-blur-2xl border border-white/10 rounded-sm shadow-2xl p-4 z-50">
                  {[
                    { to: '/', label: 'THREAT MAP' },
                    { to: '/scan', label: 'SCANNER' },
                    { to: '/intercept', label: 'VAULT' },
                    { to: '/feed', label: 'INTEL FEED' }
                  ].map(item => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="block py-3 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 hover:text-[var(--color-primary)] hover:bg-white/5 transition-all"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-4 text-white/20">
                <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
              </div>
              <Link 
                to="/scan"
                className="px-6 py-2.5 bg-white/[0.04] border border-white/[0.08] text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover:border-[var(--color-primary)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all backdrop-blur-sm"
              >
                DEPLOY SHIELD
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-[2]">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/intercept" element={<Intercept />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer — refined glassmorphism */}
      <footer className="bg-[rgba(16,19,26,0.5)] backdrop-blur-xl border-t border-white/[0.04] py-8 mt-auto text-center relative z-[2]">
        <div className="flex justify-center gap-4 mb-4 opacity-30">
          <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-pulse"></div>
          <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">
          System v1.0.4 // Secured by Sentient Shield Protocol // &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AppLayout />
    </AppErrorBoundary>
  );
}

export default App;
