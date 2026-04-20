import { useState } from 'react';
import { api } from '../lib/api';

export function useScan() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scan = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.scan(payload);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred during scan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { scan, data, loading, error, reset: () => { setData(null); setError(null); } };
}
