import React from 'react';
import { AnalyticsFeed } from '../components/AnalyticsFeed';

export function Feed() {
  return (
    <div className="max-w-5xl mx-auto animate-[var(--animate-fade-in)] relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-secondary-container)] opacity-[0.02] blur-[120px] rounded-full pointer-events-none"></div>

      <div className="mb-12 text-center relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-4 uppercase tracking-tighter hud-glow">Global Intelligence</h1>
        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">
          Community-sourced threat vectors // Collaborative defense protocol
        </p>
      </div>

      <AnalyticsFeed />
    </div>
  );
}
