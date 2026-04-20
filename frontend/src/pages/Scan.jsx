import React from 'react';
import { ScanInput } from '../components/ScanInput';
import { VerdictCard } from '../components/VerdictCard';
import { PdrmReport } from '../components/PdrmReport';
import { useScan } from '../hooks/useScan';

export function Scan() {
  const { scan, data, loading, error, reset } = useScan();

  const handleScan = async (payload) => {
    reset();
    await scan(payload);
  };

  return (
    <div className="max-w-4xl mx-auto animate-[var(--animate-fade-in)] relative">
      {/* Decorative background orbs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-[var(--color-primary)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-secondary-container)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="mb-8 text-center relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-4 uppercase tracking-tighter hud-glow">Threat Analysis Terminal</h1>
        <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">
          Uplink established // Monitoring global scam vectors
        </p>
      </div>

      <ScanInput onScan={handleScan} loading={loading} />

      {error && (
        <div className="mt-6 p-4 bg-red-500/20 border-l-4 border-red-500 text-red-200 rounded">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {data && data.verdict && (
        <VerdictCard verdict={data.verdict} />
      )}

      {data && data.verdict?.tier === 'HIGH' && data.pdrm_report_template && (
        <PdrmReport reportTemplate={data.pdrm_report_template} />
      )}
    </div>
  );
}
