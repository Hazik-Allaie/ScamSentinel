import React from 'react';
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import { Scan } from './pages/Scan';
import { Intercept } from './pages/Intercept';
import { Feed } from './pages/Feed';
import { Landing } from './pages/Landing';

function App() {
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-body selection:bg-[var(--color-primary)] selection:text-[var(--color-on-primary)]">
      {/* Background scanline effect overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] z-[100]"></div>
      
      {/* Navigation Bar */}
      <header className="bg-[#10131a]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="font-display font-black text-xl uppercase tracking-tighter text-[var(--color-primary)]">
                ScamSentinel
              </div>
            </Link>
            
            <nav className="hidden lg:flex space-x-8">
              {[
                { to: '/', label: 'THREAT MAP' },
                { to: '/scan', label: 'SCANNER' },
                { to: '/intercept', label: 'VAULT' }
              ].map(item => (
                <NavLink 
                  key={item.label}
                  to={item.to} 
                  className={({ isActive }) => `
                    text-[10px] font-bold uppercase tracking-[0.3em] transition-all
                    ${isActive ? 'text-[var(--color-primary)]' : 'text-white/40 hover:text-white'}
                  `}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-white/20">
                <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                <svg className="w-4 h-4 cursor-pointer hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
              </div>
              <Link 
                to="/scan"
                className="px-6 py-2.5 bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover:border-[var(--color-primary)] transition-all"
              >
                DEPLOY SHIELD
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/intercept" element={<Intercept />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-[#10131a]/60 backdrop-blur-lg border-t border-white/5 py-8 mt-auto text-center">
        <div className="flex justify-center gap-4 mb-4 opacity-30">
          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full"></div>
        </div>
        <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-bold">
          System v1.0.4 // Secured by Sentient Shield Protocol // &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;
