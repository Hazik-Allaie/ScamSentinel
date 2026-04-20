import React from 'react';

export function VerdictCard({ verdict }) {
  if (!verdict) return null;

  // Map backend properties to expected variables
  const { tier, score, reasoning, indicators, sources } = verdict;

  const config = {
    HIGH: { 
      color: 'var(--color-risk-high)', 
      bg: 'var(--color-risk-high-bg)', 
      label: 'Critical Threat Detected',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    MEDIUM: { 
      color: 'var(--color-risk-medium)', 
      bg: 'var(--color-risk-medium-bg)', 
      label: 'Suspicious Activity',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    LOW: { 
      color: 'var(--color-risk-low)', 
      bg: 'var(--color-risk-low-bg)', 
      label: 'Clear Signal',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const { color, bg, label, icon } = config[tier] || config.LOW;

  return (
    <div className="mt-8 animate-[var(--animate-slide-up)] relative">
      <div className="absolute -inset-1 blur-xl opacity-20" style={{ backgroundColor: color }}></div>
      <div 
        className="relative bg-[#10131a] border-l-4 p-8 rounded-sm shadow-2xl overflow-hidden"
        style={{ borderColor: color }}
      >
        {/* Background watermark */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
          <div className="font-display font-black text-8xl uppercase tracking-tighter">{tier}</div>
        </div>

        <div className="flex items-start gap-8 relative z-10">
          <div className="p-4 rounded-sm" style={{ backgroundColor: bg, color: color }}>
            {icon}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-[0.4em] opacity-50 mb-1">Threat Status</h3>
                <h2 className="font-display font-black text-3xl uppercase tracking-tight" style={{ color: color }}>{label}</h2>
              </div>
              <div className="text-right">
                <div className="font-display font-black text-4xl" style={{ color: color }}>{score}<span className="text-sm opacity-30">/100</span></div>
                <div className="text-[10px] uppercase tracking-widest opacity-40">Risk Index Score</div>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-sm mb-6">
              <p className="text-white/80 leading-relaxed text-sm italic">
                "{reasoning}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 underline decoration-[var(--color-primary)]/30 underline-offset-4">Verified Indicators</h4>
                <ul className="space-y-2">
                  {(indicators || []).length > 0 ? indicators.map((ind, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: color }}></span>
                      {ind}
                    </li>
                  )) : (
                    <li className="text-xs text-white/30 italic">No specific indicators found</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 underline decoration-[var(--color-primary)]/30 underline-offset-4">Intelligence Sources</h4>
                <div className="flex flex-wrap gap-2">
                  {(sources || []).length > 0 ? sources.map((src, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-tighter text-white/60">
                      REF_{src.toString().toUpperCase()}
                    </span>
                  )) : (
                    <span className="text-[9px] uppercase tracking-tighter text-white/20">General Model Intelligence</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
