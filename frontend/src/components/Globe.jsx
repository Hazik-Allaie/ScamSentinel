import React, { useEffect, useRef, useState } from 'react';
import GlobeGL from 'react-globe.gl';

export function Globe() {
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
    <div className="w-full h-full cursor-move">
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
    </div>
  );
}
