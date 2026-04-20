import React, { useState } from 'react';
import { useFeed } from '../hooks/useFeed';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function AnalyticsFeed() {
  const [threatType, setThreatType] = useState('');
  const [region, setRegion] = useState('');

  const { feed, loading, error } = useFeed({
    limit: 100,
    threat_type: threatType,
    region: region
  });

  // Simple aggregations for chart (mocked dates for demo if feed is sparse)
  const chartData = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        label: 'Scam Reports (7 Days)',
        data: [12, 19, 15, 25, 22, 30, feed.length || 0],
        borderColor: '#00daf3',
        backgroundColor: 'rgba(0, 218, 243, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#e1e2eb' } },
    },
    scales: {
      x: { ticks: { color: '#e1e2eb' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      y: { ticks: { color: '#e1e2eb' }, grid: { color: 'rgba(255,255,255,0.1)' } }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Filters & Chart */}
      <div className="glass-panel p-1 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="bg-[#10131a] p-8 border border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter hud-glow">Global Threat Feed</h2>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] mt-1">Real-time Community Intelligence Node</p>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <select 
                className="flex-1 md:w-40 bg-white/[0.02] border border-white/10 rounded-sm p-3 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:border-[var(--color-primary)] transition-all"
                value={threatType}
                onChange={(e) => setThreatType(e.target.value)}
              >
                <option value="" className="bg-[#10131a]">All Vectors</option>
                <option value="PHISHING" className="bg-[#10131a]">Phishing</option>
                <option value="MULE_ACCOUNT" className="bg-[#10131a]">Mule Account</option>
                <option value="IMPERSONATION" className="bg-[#10131a]">Impersonation</option>
                <option value="INVESTMENT" className="bg-[#10131a]">Investment</option>
              </select>
              
              <select 
                className="flex-1 md:w-40 bg-white/[0.02] border border-white/10 rounded-sm p-3 text-[10px] font-bold uppercase tracking-widest text-white/60 focus:border-[var(--color-primary)] transition-all"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="" className="bg-[#10131a]">Global Region</option>
                <option value="Kuala Lumpur" className="bg-[#10131a]">KL Sector</option>
                <option value="Selangor" className="bg-[#10131a]">Selangor Zone</option>
                <option value="Johor" className="bg-[#10131a]">Johor Zone</option>
                <option value="Penang" className="bg-[#10131a]">Penang Sector</option>
              </select>
            </div>
          </div>

          <div className="h-72 mb-4 bg-black/20 p-4 rounded-sm border border-white/5 relative">
            {/* Chart grid background effect */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-5 pointer-events-none"></div>
            <Line options={chartOptions} data={chartData} />
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs text-white/30 uppercase tracking-[0.5em] px-4">Intercepted Signals // Recent</h3>
        
        {loading && (
          <div className="text-center py-12 glass-panel border border-white/5">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-display text-[10px] uppercase tracking-widest text-white/20">Synchronizing Data Stream...</p>
          </div>
        )}
        
        {error && (
          <div className="p-8 bg-red-500/10 border border-red-500/20 text-red-400 text-center font-mono text-xs uppercase tracking-widest">
            Critical System Error: {error}
          </div>
        )}
        
        {!loading && !error && feed.length === 0 && (
          <div className="p-12 text-center glass-panel border border-white/5">
            <p className="font-display text-[10px] uppercase tracking-widest text-white/20">No active threats detected in this sector.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {feed.map((item) => (
            <div key={item.id} className="group glass-panel p-6 rounded-sm border border-white/5 hover:border-[var(--color-primary)]/30 hover:bg-white/[0.03] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
              {/* Scanline hover effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-primary)]/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 pointer-events-none"></div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter ${
                    item.tier === 'HIGH' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                    item.tier === 'MEDIUM' ? 'bg-yellow-500 text-black' :
                    'bg-green-500 text-white'
                  }`}>
                    {item.threat_type || 'UNKNOWN'}
                  </span>
                  <span className="font-mono text-[10px] text-white/20 uppercase tracking-tighter">
                    {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString() : 'LIVE'}
                  </span>
                </div>
                <p className="text-xs text-white/60 font-mono line-clamp-1 group-hover:text-white/90 transition-colors">
                  {item.indicators?.join(' • ') || 'NO_INDICATORS_LOGGED'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-display font-black text-white group-hover:text-[var(--color-primary)] transition-colors hud-glow">{item.score}<span className="text-[10px] opacity-20 ml-1">/100</span></div>
                <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{item.region || 'SYS_GLOBAL'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
