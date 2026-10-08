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

// custom hook to automatically poll job status and extraction results while active
// stops polling once the job finishes (done / failed / cancelled)
export function useJobPolling(jobId: string): UseJobPollingReturn {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: use refs instead of state for in-flight and status checks!
  // If we used state inside setInterval/setTimeout, we'd get stale closures or trigger unnecessary re-renders.
  // inFlightRef prevents slow network responses from piling up on top of each other.
  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<string | null>(null);

  // fetch both job metadata and ticket result list concurrently with Promise.all
  const fetchOnce = useCallback(async (isInitial = false) => {
    // skip if there is no jobId or if another request is still traveling across the network
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
      statusRef.current = jobData.status; // update our ref so the polling timer sees the latest status immediately
      setError(null);
    } catch (err: unknown) {
      // ignore abort errors from unmounting or cancelling
      if (err instanceof Error && err.name === "AbortError") return;

      // only display full error banner on the initial page load
      // for subsequent background polls, keep showing last good data so the screen doesn't flicker
      if (isInitial) {
        setError("Could not load job");
      }
    } finally {
      inFlightRef.current = false;
      if (isInitial) setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    // kick off the first fetch immediately so user doesn't wait 1s with empty screen
    fetchOnce(true);

    // loop that checks every 1000ms until the job reaches a finished state
    const pollLoop = async () => {
      const isTerminal =
        statusRef.current === "done" ||
        statusRef.current === "cancelled" ||
        statusRef.current === "failed";

      if (!isTerminal) {
        await fetchOnce(false);
      }

      // check again in case the fetch above just changed status to terminal
      const stillNotTerminal =
        statusRef.current !== "done" &&
        statusRef.current !== "cancelled" &&
        statusRef.current !== "failed";

      if (isMounted && stillNotTerminal) {
        timer = setTimeout(pollLoop, 1000);
      }
    };

    timer = setTimeout(pollLoop, 1000);

    // cleanup: clear timeout and cancel pending HTTP fetch if user navigates away
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [jobId, fetchOnce]);

  // allows UI components to optimistically update the results list immediately
  // (e.g. after editing a field or resolving a review) without waiting for the next 1s poll tick
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
