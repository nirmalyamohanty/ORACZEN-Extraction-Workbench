"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JobResponse, JobResultsResponse } from "./types";
import { getJob, getJobResults } from "./api";

interface UseJobPollingReturn {
  job: JobResponse | null;
  results: JobResultsResponse | null;
  loading: boolean;
  error: string | null;
  mutateResults: (updater: (prev: JobResultsResponse | null) => JobResultsResponse | null) => void;
  refresh: () => Promise<void>;
}

export function useJobPolling(jobId: string): UseJobPollingReturn {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent concurrent in-flight requests from stacking
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
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (isInitial) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      }
      // On subsequent poll failures keep last good data visible
    } finally {
      inFlightRef.current = false;
      if (isInitial) setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Kick off the first fetch immediately
    fetchOnce(true);

    // Poll every 1 s while the job is active; stop once it reaches a terminal state
    const pollLoop = async () => {
      const active =
        statusRef.current === "queued" ||
        statusRef.current === "running" ||
        statusRef.current === null;
      if (active) await fetchOnce(false);
      const stillActive =
        statusRef.current === "queued" || statusRef.current === "running";
      if (isMounted && stillActive) {
        timer = setTimeout(pollLoop, 1000);
      }
    };

    timer = setTimeout(pollLoop, 1000);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (abortControllerRef.current) abortControllerRef.current.abort();
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
    mutateResults,
    refresh: () => fetchOnce(false),
  };
}
