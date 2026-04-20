import React, { useState, useRef } from 'react';

const TABS = ['Text/SMS', 'URL', 'QR Code', 'Voice', 'Payment Link'];

export function ScanInput({ onScan, loading }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim() && activeTab !== 'Voice' && activeTab !== 'QR Code') return;
    
    // Mapping tabs to API input_type
    const typeMap = {
      'Text/SMS': 'sms_text',
      'URL': 'url',
      'Payment Link': 'payment_link',
      'QR Code': 'qr_code',
      'Voice': 'voice_transcript'
    };

    onScan({
      input_type: typeMap[activeTab],
      raw_content: inputVal,
      extracted_entities: {},
      metadata: { browser: navigator.userAgent },
      user_id: 'anonymous'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // In a real app, we'd send the file as multipart or base64
    // For now, let's simulate by putting the filename as content
    // or we could convert to base64.
    const reader = new FileReader();
    reader.onload = (event) => {
      onScan({
        input_type: 'qr_code',
        raw_content: event.target.result, // base64
        extracted_entities: {},
        metadata: { filename: file.name }
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate real-time transcript
      setInputVal('Listening...');
      setTimeout(() => setInputVal('Help, I need your TAC number...'), 2000);
    } else {
      // Stop recording and scan
      handleSubmit({ preventDefault: () => {} });
    }
  };

  return (
    <div className="glass-panel p-1 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="bg-[#10131a] p-6 border border-white/5">
        <div className="flex space-x-2 border-b border-white/5 mb-8 overflow-x-auto pb-0 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setInputVal(''); }}
              className={`whitespace-nowrap px-6 py-4 font-display text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                activeTab === tab 
                  ? 'text-[var(--color-primary)]' 
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></div>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {activeTab === 'QR Code' && (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="border border-white/5 bg-white/[0.02] rounded-sm p-16 text-center text-white/30 hover:border-[var(--color-primary)]/30 hover:bg-white/[0.04] cursor-pointer transition-all group"
            >
              <div className="mb-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="font-display text-[10px] uppercase tracking-widest">Initialise Data Uplink // Select QR Module</p>
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </div>
          )}

          {activeTab === 'Voice' && (
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.02] rounded-sm border border-white/5 relative overflow-hidden">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--color-primary)]/30"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--color-primary)]/30"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--color-primary)]/30"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--color-primary)]/30"></div>

              <button 
                type="button" 
                onClick={toggleRecording}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all relative z-10 ${
                  isRecording 
                    ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <svg className={`w-12 h-12 ${isRecording ? 'text-white' : 'text-red-500/60'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-2a5 5 0 01-10 0H3a7.001 7.001 0 006 6.93V17H6v2h8v-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
              
              <div className="mt-8 text-center">
                <p className="font-display text-[10px] uppercase tracking-[0.4em] text-white/40">
                  {isRecording ? 'Acoustic Signature Detection Active' : 'Voice Signal Intercept'}
                </p>
              </div>

              {isRecording && (
                <div className="mt-8 w-full max-w-md p-6 bg-black/60 rounded-sm border border-[var(--color-primary)]/10 font-mono text-[11px] text-[var(--color-primary)]/80 leading-relaxed">
                  <div className="flex gap-2 mb-2 opacity-50">
                    <div className="w-1 h-1 bg-[var(--color-primary)] animate-pulse"></div>
                    <div className="w-1 h-1 bg-[var(--color-primary)] animate-pulse delay-75"></div>
                    <div className="w-1 h-1 bg-[var(--color-primary)] animate-pulse delay-150"></div>
                  </div>
                  {inputVal}
                </div>
              )}
            </div>
          )}

          {['Text/SMS', 'URL', 'Payment Link'].includes(activeTab) && (
            <div className="relative group">
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={`INPUT_SIGNAL: ${activeTab.toUpperCase()}`}
                className="w-full bg-white/[0.02] border border-white/5 rounded-sm p-6 text-white placeholder-white/10 focus:outline-none focus:border-[var(--color-primary)]/30 min-h-[200px] transition-all resize-none font-mono text-sm leading-relaxed"
              />
              <div className="absolute bottom-4 right-4 font-display text-[9px] uppercase tracking-widest text-white/10 pointer-events-none group-focus-within:text-[var(--color-primary)]/20 transition-colors">
                Ready for Analysis //
              </div>
            </div>
          )}

          {activeTab !== 'Voice' && activeTab !== 'QR Code' && (
            <button 
              type="submit" 
              disabled={loading || !inputVal.trim()}
              className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-[var(--color-on-primary)] font-display font-black text-xs uppercase tracking-[0.3em] py-5 px-8 rounded-sm hover:brightness-110 disabled:opacity-20 transition-all shadow-[0_0_30px_rgba(0,218,243,0.2)] mt-2"
            >
              {loading ? 'Executing Heuristic Scan...' : 'Initiate Sentient Analysis'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
