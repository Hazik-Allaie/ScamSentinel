import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFeed(filters = {}) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
