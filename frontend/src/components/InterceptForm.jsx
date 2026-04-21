import React, { useState, useEffect } from 'react';

export function InterceptForm({ onIntercept, loading, result }) {
  const [type, setType] = useState('bank_account');
  const [identifier, setIdentifier] = useState('');

  // Reset form fields when a new result arrives
  useEffect(() => {
    if (result) {
      setIdentifier('');
    }
  }, [result]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    onIntercept({
      identifier: identifier.trim(),
      identifier_type: type,
    });
  };

  return (
    <div className="glass-panel p-1 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg mx-auto">
      <div className="bg-[#10131a] p-8 border border-white/5">
        <h2 className="text-2xl font-display font-black text-white mb-8 uppercase tracking-tighter hud-glow">Intercept Protocol</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Identifier Module</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-sm p-4 text-white focus:outline-none focus:border-[var(--color-primary)] transition-all font-mono text-sm uppercase"
            >
              <option value="bank_account" className="bg-[#10131a]">Bank Account</option>
              <option value="phone_number" className="bg-[#10131a]">Phone Number (DuitNow)</option>
              <option value="ewallet_id" className="bg-[#10131a]">E-Wallet ID</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Target Signal</label>
            <input 
              type="text" 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="E.G. 1122334455"
              className="w-full bg-white/[0.02] border border-white/10 rounded-sm p-4 text-white placeholder-white/10 focus:outline-none focus:border-[var(--color-primary)] transition-all font-mono text-sm"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-[var(--color-on-primary)] font-display font-black text-xs uppercase tracking-[0.3em] py-5 px-8 rounded-sm hover:brightness-110 disabled:opacity-20 transition-all shadow-[0_0_30px_rgba(0,218,243,0.2)]"
          >
            {loading ? 'Consulting Intel Database...' : 'Query High-Risk DB'}
          </button>
        </form>

        {result && (
          <div className={`mt-8 p-6 rounded-sm border-l-4 animate-[var(--animate-slide-up)] relative overflow-hidden ${
            result.verdict === 'BLOCK' 
              ? 'bg-[var(--color-risk-high-bg)] border-[var(--color-risk-high)]' 
              : 'bg-[var(--color-risk-low-bg)] border-[var(--color-risk-low)]'
          }`}>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className={`font-display font-black text-2xl uppercase tracking-tighter ${
                result.verdict === 'BLOCK' ? 'text-[var(--color-risk-high)]' : 'text-[var(--color-risk-low)]'
              }`}>
                {result.verdict === 'BLOCK' ? 'Intercept & Block' : 'Clearance Granted'}
              </h3>
              <span className="font-mono text-[10px] opacity-40 uppercase tracking-widest">
                Conf: {(result.confidence * 100).toFixed(0)}% // {result.processing_ms}ms
              </span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed font-mono relative z-10">
              {result.explanation}
            </p>
            {result.matched_report_id && (
              <p className="text-[10px] text-white/30 mt-3 font-mono">
                Matched Report: {result.matched_report_id}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
