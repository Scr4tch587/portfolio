import { useEffect, useState } from 'react';

const processedReadmeCache = new Map();

export function useProcessedReadme(project) {
  const projectId = project?.id;
  const commitSha = project?.processedReadmeRef?.commitSha;
  const downloadUrl = project?.processedReadmeRef?.downloadUrl;
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (!downloadUrl) {
      setState({ data: null, loading: false, error: '' });
      return;
    }

    const key = `${projectId || 'unknown'}:${commitSha || 'none'}`;
    if (processedReadmeCache.has(key)) {
      setState({ data: processedReadmeCache.get(key), loading: false, error: '' });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    fetch(downloadUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load processed README (${response.status}).`);
        }
        return response.json();
      })
      .then((json) => {
        processedReadmeCache.set(key, json);
        if (!cancelled) {
          setState({ data: json, loading: false, error: '' });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error?.message || 'Failed to load processed README.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [commitSha, downloadUrl, projectId]);

  return state;
}
