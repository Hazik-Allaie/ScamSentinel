import React from 'react';

export function VerdictCard({ verdict }) {
  if (!verdict) return null;

  const { threat_type, risk_score, tier, explanation, confidence, cited_sources, rag_passages_used, model_used, processing_ms } = verdict;

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
    <div className="mt-8 animate-[var(--animate-slide-up)] relative" role="alert" aria-live="assertive">
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
                <div className="font-display font-black text-4xl" style={{ color: color }}>{risk_score}<span className="text-sm opacity-30">/100</span></div>
                <div className="text-[10px] uppercase tracking-widest opacity-40">Risk Index Score</div>
              </div>
            </div>

            {/* Threat type badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 text-[9px] font-black uppercase tracking-tighter rounded-sm" style={{ backgroundColor: bg, color: color }}>
                {threat_type?.replace(/_/g, ' ') || 'UNKNOWN'}
              </span>
              <span className="text-[9px] text-white/20 font-mono uppercase">
                Confidence: {(confidence * 100).toFixed(0)}% // {processing_ms}ms // {model_used}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-sm mb-6">
              <p className="text-white/80 leading-relaxed text-sm italic">
                "{explanation}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 underline decoration-[var(--color-primary)]/30 underline-offset-4">Cited Sources</h4>
                <ul className="space-y-2">
                  {(cited_sources || []).length > 0 ? cited_sources.map((src, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: color }}></span>
                      {src}
                    </li>
                  )) : (
                    <li className="text-xs text-white/30 italic">General model intelligence</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 underline decoration-[var(--color-primary)]/30 underline-offset-4">RAG Passages</h4>
                <div className="space-y-2">
                  {(rag_passages_used || []).length > 0 ? rag_passages_used.slice(0, 3).map((passage, i) => (
                    <div key={i} className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-sm">
                      <div className="text-[9px] font-bold uppercase tracking-tighter text-[var(--color-primary)] mb-1">
                        [{passage.source}] {passage.document_id}
                      </div>
                      <p className="text-[10px] text-white/40 line-clamp-2">{passage.passage_text}</p>
                    </div>
                  )) : (
                    <span className="text-[9px] uppercase tracking-tighter text-white/20">No RAG passages retrieved</span>
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
