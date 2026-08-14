"use client";

import { FormEvent, useEffect, useState } from "react";

import { createJob, getJobs } from "@/lib/api";

import Link from "next/link";

type Job = {
  id: number;
  company: string;
  title: string;
  location?: string | null;
  job_url?: string | null;
  description: string;
  created_at?: string | null;
};

type JobFormData = {
  company: string;
  title: string;
  location: string;
  job_url: string;
  description: string;
};

const EMPTY_JOB_FORM: JobFormData = {
  company: "",
  title: "",
  location: "",
  job_url: "",
  description: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobFormData>(EMPTY_JOB_FORM);

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);

      const data = await getJobs();

      setJobs(data);
    } catch (err) {
      console.error(err);

      setError("Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

  function updateField(field: keyof JobFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !formData.company.trim() ||
      !formData.title.trim() ||
      !formData.description.trim()
    ) {
      setFormError("Company, title, and job description are required.");

      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setSuccessMessage(null);

      await createJob({
        company: formData.company.trim(),

        title: formData.title.trim(),

        location: formData.location.trim() || undefined,

        job_url: formData.job_url.trim() || null,

        description: formData.description.trim(),
      });

      setFormData(EMPTY_JOB_FORM);

      setSuccessMessage("Job saved.");

      await loadJobs();
    } catch (err) {
      console.error(err);

      setFormError(err instanceof Error ? err.message : "Unable to save job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Jobs</h1>

          <p className="mt-2 text-sm text-gray-600">
            Save target roles and tailor your resume for each application.
          </p>
        </div>

        <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Add Job</h2>

            <p className="mt-1 text-sm text-gray-600">
              Paste the full job description so Naomatch can tailor your resume
              against the actual posting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="company"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Company
                </label>

                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(event) =>
                    updateField("company", event.target.value)
                  }
                  placeholder="e.g. Company name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Job Title
                </label>

                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="e.g. Software Engineer"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Location
                </label>

                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(event) =>
                    updateField("location", event.target.value)
                  }
                  placeholder="e.g. New York, NY"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="job_url"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Job URL
                </label>

                <input
                  id="job_url"
                  type="url"
                  value={formData.job_url}
                  onChange={(event) =>
                    updateField("job_url", event.target.value)
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Job Description
              </label>

              <textarea
                id="description"
                value={formData.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={12}
                placeholder="Paste the full job description here..."
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-gray-500"
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 transition-opacity duration-300">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Job"}
              </button>
            </div>
          </form>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Saved Jobs</h2>

            <p className="mt-1 text-sm text-gray-600">
              {jobs.length === 1 ? "1 saved job" : `${jobs.length} saved jobs`}
            </p>
          </div>

          {loading && <p className="text-sm text-gray-600">Loading jobs...</p>}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900">No jobs yet</h3>

              <p className="mt-2 text-sm text-gray-600">
                Add a job posting above to start tailoring a resume.
              </p>
            </div>
          )}

          {!loading && !error && jobs.length > 0 && (
            <div className="space-y-4">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {job.company}
                      </p>

                      {job.location && (
                        <p className="mt-1 text-sm text-gray-500">
                          {job.location}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      Job #{job.id}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                    {job.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                    >
                      View Job
                    </Link>

                    {job.job_url && (
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-gray-700 underline underline-offset-4"
                      >
                        Original Posting
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
