"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { getJob } from "@/lib/api";

type Job = {
  id: number;
  company: string;
  title: string;
  location?: string | null;
  job_url?: string | null;
  description: string;
  created_at?: string | null;
};

export default function JobDetailPage() {
  const params = useParams();

  const jobId = Number(params.id);

  const [job, setJob] = useState<Job | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJob() {
      if (!Number.isInteger(jobId) || jobId <= 0) {
        setError("Invalid job ID.");

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await getJob(jobId);

        setJob(data);
      } catch (err) {
        console.error(err);

        setError(err instanceof Error ? err.message : "Unable to load job.");
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/jobs"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back to Jobs
        </Link>

        {loading && (
          <p className="mt-8 text-sm text-gray-600">Loading job...</p>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && job && (
          <>
            <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {job.title}
                  </h1>

                  <p className="mt-2 text-lg font-medium text-gray-700">
                    {job.company}
                  </p>

                  {job.location && (
                    <p className="mt-1 text-sm text-gray-500">{job.location}</p>
                  )}
                </div>

                {job.job_url && (
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Original Posting ↗
                  </a>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">
                Job Description
              </h2>

              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {job.description}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
