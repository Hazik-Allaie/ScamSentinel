import React from 'react';
import { InterceptForm } from '../components/InterceptForm';
import { useIntercept } from '../hooks/useIntercept';

export function Intercept() {
  const { intercept, data, loading, error, reset } = useIntercept();

  const handleIntercept = async (payload) => {
    reset();
    await intercept(payload);
  };

  return (
    <div className="max-w-4xl mx-auto animate-[var(--animate-fade-in)] relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-primary)] opacity-[0.02] blur-[150px] rounded-full pointer-events-none"></div>

      <div className="mb-12 text-center relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-4 uppercase tracking-tighter hud-glow">Database Intercept</h1>
        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">
          Querying high-risk financial nodes // Mule account detection active
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border-l-4 border-red-500 text-red-200 rounded max-w-lg mx-auto">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <InterceptForm onIntercept={handleIntercept} loading={loading} result={data} />
    </div>
  );
}
