"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JobResponse, JobResultsResponse } from "./types";
import { getJob, getJobResults } from "./api";

interface UseJobPollingReturn {
  job: JobResponse | null;
  results: JobResultsResponse | null;
  loading: boolean;
  error: string | null;
  reconnecting: boolean;
  mutateResults: (updater: (prev: JobResultsResponse | null) => JobResultsResponse | null) => void;
  refresh: () => Promise<void>;
}

export function useJobPolling(jobId: string): UseJobPollingReturn {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  // References to prevent stacking and enable clean teardown
  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<string | null>(null);

  const fetchOnce = useCallback(async (isInitial = false) => {
    if (!jobId || inFlightRef.current) return;

    inFlightRef.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const [jobData, resultsData] = await Promise.all([
        getJob(jobId, signal),
        getJobResults(jobId, undefined, signal),
      ]);

      setJob(jobData);
      setResults(resultsData);
      statusRef.current = jobData.status;
      setError(null);
      setReconnecting(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      // Keep showing last good data if poll fails; show reconnecting if we have data
      if (isInitial && !job) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      } else {
        setReconnecting(true);
      }
    } finally {
      inFlightRef.current = false;
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [jobId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Initial fetch
    fetchOnce(true);

    const pollLoop = async () => {
      // Continue polling only while status is queued or running
      if (statusRef.current === "queued" || statusRef.current === "running" || statusRef.current === null) {
        await fetchOnce(false);
      }
      if (isMounted && (statusRef.current === "queued" || statusRef.current === "running")) {
        timer = setTimeout(pollLoop, 1000);
      }
    };

    timer = setTimeout(pollLoop, 1000);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [jobId, fetchOnce]);

  const mutateResults = useCallback(
    (updater: (prev: JobResultsResponse | null) => JobResultsResponse | null) => {
      setResults((prev) => updater(prev));
    },
    []
  );

  return {
    job,
    results,
    loading,
    error,
    reconnecting,
    mutateResults,
    refresh: () => fetchOnce(false),
  };
}
