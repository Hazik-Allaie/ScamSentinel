import React, { useEffect, useRef, useState, Suspense } from 'react';

// Lazy-load the heavy WebGL globe to prevent it from crashing the whole app
const GlobeGL = React.lazy(() => import('react-globe.gl').then(mod => ({ default: mod.default })));

function GlobeInner() {
  const globeEl = useRef();
  const [arcsData, setArcsData] = useState([]);
  const [pointsData, setPointsData] = useState([]);

  useEffect(() => {
    // Generate random arcs representing "threat intelligence" connections
    const arcs = [...Array(20).keys()].map(() => ({
      startLat: (Math.random() - 0.5) * 180,
      startLng: (Math.random() - 0.5) * 360,
      endLat: (Math.random() - 0.5) * 180,
      endLng: (Math.random() - 0.5) * 360,
      color: [['#00daf3', '#6f00be', '#c3f5ff'][Math.round(Math.random() * 2)], ['#00daf3', '#6f00be', '#c3f5ff'][Math.round(Math.random() * 2)]]
    }));
    setArcsData(arcs);

    // Generate random points representing "threat nodes"
    const points = [...Array(40).keys()].map(() => ({
      lat: (Math.random() - 0.5) * 180,
      lng: (Math.random() - 0.5) * 360,
      size: Math.random() * 0.5,
      color: '#00daf3'
    }));
    setPointsData(points);

    // Auto-rotate
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  return (
    <GlobeGL
      ref={globeEl}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      width={800}
      height={600}
      
      arcsData={arcsData}
      arcColor={'color'}
      arcDashLength={0.4}
      arcDashGap={4}
      arcDashAnimateTime={2000}
      arcStroke={0.5}

      pointsData={pointsData}
      pointColor={'color'}
      pointAltitude={0.01}
      pointRadius={'size'}

      atmosphereColor="#00daf3"
      atmosphereAltitude={0.15}
    />
  );
}

// Error boundary to prevent globe crashes from taking down the whole app
class GlobeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Globe component failed to load:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-[var(--color-primary)]/30 flex items-center justify-center bg-[var(--color-primary)]/5">
              <svg className="w-10 h-10 text-[var(--color-primary)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
              Globe visualization unavailable
            </p>
            <p className="text-[9px] uppercase tracking-widest text-white/15 mt-2">
              WebGL required // Threat map data still active
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading fallback
function GlobeLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 animate-pulse">
          Initializing Threat Map...
        </p>
      </div>
    </div>
  );
}

export function Globe() {
  return (
    <div className="w-full h-full cursor-move">
      <GlobeErrorBoundary>
        <Suspense fallback={<GlobeLoader />}>
          <GlobeInner />
        </Suspense>
      </GlobeErrorBoundary>
    </div>
  );
}
