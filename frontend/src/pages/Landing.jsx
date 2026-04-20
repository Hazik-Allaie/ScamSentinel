import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from '../components/Globe';

export function Landing() {
  return (
    <div className="animate-[var(--animate-fade-in)]">
      {/* 1. Hero Section */}
      <section className="relative pb-32 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-sm">
              <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-pulse"></span>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">Protocol Active // v1.0.4</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-display font-black uppercase tracking-tighter leading-[0.85]">
              The <span className="text-[var(--color-primary)]">Sentient</span><br />
              Shield
            </h1>
            
            <p className="text-lg text-white/50 max-w-md leading-relaxed font-medium">
              Beyond protection. Beyond detection. ScamSentinel utilizes a decentralized intelligence mesh to neutralize threats before they reach your interface.
            </p>

            <div className="flex gap-4 pt-4">
              <Link 
                to="/scan" 
                className="px-10 py-5 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-display font-black text-xs uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all shadow-[0_0_30px_rgba(0,218,243,0.3)]"
              >
                Initialize Scan
              </Link>
              <Link 
                to="/feed" 
                className="px-10 py-5 border border-white/10 text-white font-display font-black text-xs uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
              >
                View Mesh Status
              </Link>
            </div>
          </div>

          {/* Globe */}
          <div className="h-[500px] lg:h-[600px] relative">
            <Globe />
            <div className="absolute bottom-0 left-0 right-0 text-center pb-4">
              <h2 className="text-2xl font-display font-black uppercase tracking-tighter text-white hud-glow">Global Threat Map</h2>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] mt-1">Real-time anomaly detection // Active Nodes: 14,204</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Shift to Intentionality */}
      <section className="py-32 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div className="space-y-8">
            <div>
              <div className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-[0.4em] mb-4">The Paradigm</div>
              <h2 className="text-5xl font-display font-black uppercase tracking-tighter leading-none mb-6">The Shift to<br />Intentionality</h2>
              <p className="text-white/40 leading-relaxed max-w-md">
                Traditional security reacts. ScamSentinel anticipates. By mapping the "Intent Signatures" of incoming data pockets, we differentiate between authentic human interaction and synthetic malicious coercion.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">Neural Intent Mapping</h4>
                  <p className="text-xs text-white/30">Analysing cognitive patterns in digital communication.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">Predictive Vectoring</h4>
                  <p className="text-xs text-white/30">Intercepting social engineering before the first contact.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6 mt-12">
              <div className="bg-[#1d2026] border border-white/5 p-4 group cursor-pointer hover:border-[var(--color-primary)]/30 transition-all">
                <div className="aspect-square mb-4 overflow-hidden">
                  <img src="/images/deep_scan.png" alt="Deep Scan" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                </div>
                <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Model // Alpha</div>
                <div className="text-sm font-display font-black uppercase tracking-tighter">Deep Scan</div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#1d2026] border border-white/5 p-4 group cursor-pointer hover:border-[var(--color-primary)]/30 transition-all">
                <div className="aspect-square mb-4 overflow-hidden">
                  <img src="/images/mesh_link.png" alt="Mesh Link" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                </div>
                <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Node // Beta</div>
                <div className="text-sm font-display font-black uppercase tracking-tighter">Mesh Link</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI-Driven Phishing Neutralization */}
      <section className="py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter mb-4">AI-Driven <span className="text-[var(--color-primary)]">Phishing Neutralization</span></h2>
          <p className="text-white/30 text-sm italic font-mono uppercase tracking-widest">Real-time heuristics for a zero-trust world.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Identity Verification', text: 'Multi-dimensional analysis of sender metadata and biometric behavior patterns to ensure absolute authenticity.', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            { title: 'URL De-obfuscation', text: 'Deep recursive inspection of link redirects, hidden scripts, and homograph character masks before they execute.', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            { title: 'Content Sanitization', text: 'Autonomous scrubbing of emotional triggers and manipulative linguistics commonly used in social engineering attacks.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
          ].map((card, i) => (
            <div key={i} className="bg-[#1d2026] border border-white/5 p-10 hover:bg-white/[0.03] transition-all group">
              <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center mb-8 border border-white/10 group-hover:border-[var(--color-primary)]/40 transition-colors">
                <svg className="w-6 h-6 text-white/40 group-hover:text-[var(--color-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} /></svg>
              </div>
              <h3 className="text-xl font-display font-black uppercase tracking-tighter mb-4">{card.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-8">{card.text}</p>
              <Link to="/scan" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:opacity-80 transition-opacity flex items-center gap-2">
                Try it now <span className="text-lg">→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Decentralized Protection */}
      <section className="py-32">
        <div className="bg-[#1d2026] border border-white/5 p-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 relative z-10">
              <div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] mb-4">Core Mesh Infrastructure</div>
                <h2 className="text-5xl font-display font-black uppercase tracking-tighter leading-none mb-6">Decentralized<br />Protection</h2>
                <p className="text-white/40 leading-relaxed max-w-md">
                  No single point of failure. ScamSentinel operates on a global mesh of validator nodes. When one node detects a new scam variant, the entire network is immunized within 300 milliseconds.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {['Zero Trust Architecture', 'Immutable Threat Logs', 'Latency-Free Processing', 'Encrypted Intelligence Sharing'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end z-10">
              <div className="w-full max-w-[400px] aspect-square bg-black p-2 border border-white/10 shadow-2xl overflow-hidden group">
                <img src="/images/crystal.png" alt="Decentralized Crystal" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Stats Bar */}
      <section className="py-16 border-t border-white/5">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-display font-black text-white">99.8%</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">Detection Accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-white">12.5k</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">Threats Blocked</div>
          </div>
          <div>
            <div className="text-3xl font-display font-black text-white">24/7</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">Active Vigilance</div>
          </div>
        </div>
      </section>
    </div>
  );
}
