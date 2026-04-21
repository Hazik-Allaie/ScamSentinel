import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { api } from '../lib/api';

export function useFeed(filters = {}) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guard: if Firestore is not initialized, fallback to REST API
    if (!isFirebaseConfigured || !db) {
      api.feed(filters)
        .then(data => {
          const mappedData = data.map(item => ({
            ...item,
            timestamp: item.timestamp,
            indicators: item.threat_indicators,
            score: item.risk_score,
          }));
          setFeed(mappedData);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'REST Feed fallback failed');
          setLoading(false);
        });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const kbRef = collection(db, 'community_kb');
      // Create an array of query constraints
      const constraints = [orderBy('timestamp', 'desc'), limit(filters.limit || 50)];

      if (filters.threat_type) {
        constraints.push(where('threat_type', '==', filters.threat_type));
      }
      if (filters.region) {
        constraints.push(where('region', '==', filters.region));
      }

      const q = query(kbRef, ...constraints);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setFeed(items);
        setLoading(false);
      }, (err) => {
        console.error("Feed snapshot error:", err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Query setup error:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [filters.limit, filters.threat_type, filters.region]);

  return { feed, loading, error };
}
