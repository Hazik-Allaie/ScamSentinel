import { useState } from 'react';
import { api } from '../lib/api';

export function useIntercept() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const intercept = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.intercept(payload);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred during intercept');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { intercept, data, loading, error, reset: () => { setData(null); setError(null); } };
}
