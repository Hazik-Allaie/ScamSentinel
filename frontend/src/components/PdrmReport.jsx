import React from 'react';

export function PdrmReport({ reportTemplate }) {
  if (!reportTemplate) return null;

  return (
    <div className="glass-panel p-1 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] mt-8 animate-[var(--animate-slide-up)]">
      <div className="bg-[#10131a] p-8 border border-white/5 relative overflow-hidden">
        {/* Background emblem effect */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
          </svg>
        </div>

        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="bg-[var(--color-primary)]/10 p-3 rounded-sm border border-[var(--color-primary)]/20 shadow-[0_0_15px_rgba(0,218,243,0.2)]">
            <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter">PDRM Intelligence Dossier</h2>
            <p className="text-[10px] font-bold text-[var(--color-primary)] opacity-40 uppercase tracking-[0.3em]">Automated Incident Documentation Template</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Signal Classification</label>
              <div className="bg-white/[0.03] border border-white/5 rounded-sm p-4 text-white/90 font-mono text-sm uppercase">
                {reportTemplate.jenis_kes || 'FRAUD_INVESTIGATION'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Timestamp detected</label>
              <div className="bg-white/[0.03] border border-white/5 rounded-sm p-4 text-white/90 font-mono text-sm">
                {reportTemplate.tarikh_kejadian || new Date().toISOString()}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Incident technical summary</label>
            <div className="bg-white/[0.03] border border-white/5 rounded-sm p-6 text-white/90 whitespace-pre-wrap font-mono text-xs leading-relaxed border-l-2 border-l-[var(--color-primary)]/20">
              {reportTemplate.penerangan_kes || 'WAITING_FOR_SIGNAL_DATA...'}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 relative z-10">
          <a 
            href={reportTemplate.portal_url || "https://ccid.rmp.gov.my/"}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-display font-black text-xs uppercase tracking-[0.2em] py-5 px-6 rounded-sm text-center transition-all hover:brightness-110 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
          >
            Transmit to PDRM Portal
          </a>
          <button 
            onClick={() => window.print()}
            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-display font-black text-xs uppercase tracking-[0.2em] py-5 px-6 rounded-sm text-center transition-all"
          >
            Local Hardcopy / PDF
          </button>
        </div>
        
        {reportTemplate.nsrc_hotline && (
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">
                Critical Response: Call NSRC Hotline <span className="text-white ml-2">{reportTemplate.nsrc_hotline}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
