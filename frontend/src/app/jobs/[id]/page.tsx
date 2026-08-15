"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  downloadTailoredResumePdf,
  getJob,
  getProfile,
  previewTailoredResume,
  type OptimizedResumePreviewResponse,
  type ProfileData,
  type TailoredResumeResponse,
} from "@/lib/api";

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

  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [tailorError, setTailorError] = useState<string | null>(null);

  const [tailoring, setTailoring] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [tailoredResume, setTailoredResume] =
    useState<TailoredResumeResponse | null>(null);

  const [previewMetrics, setPreviewMetrics] =
    useState<OptimizedResumePreviewResponse | null>(null);

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

        const [jobData, profileData] = await Promise.all([
          getJob(jobId),
          getProfile(),
        ]);

        setJob(jobData);
        setProfile(profileData);
      } catch (err) {
        console.error(err);

        setError(err instanceof Error ? err.message : "Unable to load job.");
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  async function handleTailorResume() {
    try {
      setTailoring(true);
      setTailorError(null);
      setTailoredResume(null);
      setPreviewMetrics(null);

      const data = await previewTailoredResume(jobId);

      setTailoredResume(data.resume);
      setPreviewMetrics(data);
    } catch (err) {
      console.error(err);

      setTailorError(
        err instanceof Error ? err.message : "Unable to tailor resume.",
      );
    } finally {
      setTailoring(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      setDownloadingPdf(true);
      setTailorError(null);

      const pdfBlob = await downloadTailoredResumePdf(jobId);

      const url = URL.createObjectURL(pdfBlob);

      const link = document.createElement("a");

      link.href = url;

      link.download =
        `${job?.company ?? "tailored"}-${job?.title ?? "resume"}-resume.pdf`
          .replace(/\s+/g, "-")
          .toLowerCase();

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      setTailorError(
        err instanceof Error ? err.message : "Unable to download resume PDF.",
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  function formatResumeDate(date?: string | null) {
    if (!date) {
      return "Present";
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  function formatResumeDateRange(
    startDate?: string | null,
    endDate?: string | null,
  ) {
    if (!startDate) {
      return "";
    }

    const start = formatResumeDate(startDate);

    if (!endDate) {
      return `${start} – Present`;
    }

    const end = formatResumeDate(endDate);

    if (start === end) {
      return start;
    }

    return `${start} – ${end}`;
  }

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

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleTailorResume}
                    disabled={tailoring || downloadingPdf}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tailoring && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}

                    {tailoring
                      ? "Tailoring..."
                      : tailoredResume
                        ? "Regenerate Resume"
                        : "Tailor Resume"}
                  </button>

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
              </div>
            </section>

            {tailorError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {tailorError}
              </div>
            )}

            {tailoring && (
              <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Tailoring your resume
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Selecting the strongest experience, projects, and skills for{" "}
                      {job.company} and fitting everything to one page.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {tailoredResume !== null && (
              <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Tailored Resume
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Generated from your vault for {job.company} ·{" "}
                        {job.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf || tailoring}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingPdf && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}

                      {downloadingPdf
                        ? "Preparing PDF..."
                        : "Download PDF"}
                    </button>
                  </div>

                  {previewMetrics && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                      {previewMetrics.page_count === 1 && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Optimized for one page
                        </span>
                      )}

                      <span>
                        Ready to review and download
                      </span>
                    </div>
                  )}
                </div>

                <div className="mx-auto max-w-[850px] border border-gray-300 bg-white px-8 py-8 shadow-sm">
                  {profile && (
                    <header className="mb-5 text-center">
                      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        {profile.name}
                      </h1>

                      <div className="mt-1 flex flex-wrap justify-center gap-x-2 text-xs text-gray-700">
                        {profile.phone && <span>{profile.phone}</span>}

                        {profile.phone && profile.email && <span className="mx-1.5">|</span>}

                        {profile.email && (
                          <a
                            href={`mailto:${profile.email}`}
                            className="hover:underline"
                          >
                            {profile.email}
                          </a>
                        )}

                        {profile.links.map((link) => (
                          <span
                            key={`${link.label}-${link.url}`}
                            className="flex gap-x-2"
                          >
                            <span className="mx-1.5">|</span>

                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {link.label}
                            </a>
                          </span>
                        ))}
                      </div>
                    </header>
                  )}

                  {tailoredResume.sections.map((section) => (
                    <section
                      key={section.section_type}
                      className="mb-5 last:mb-0"
                    >
                      <h3 className="border-b border-gray-900 pb-1 text-sm font-bold uppercase tracking-wide text-gray-900">
                        {section.title}
                      </h3>

                      {section.section_type === "education" && (
                        <div className="mt-2 space-y-3">
                          {section.items.map((item) => (
                            <div key={item.id}>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {item.school}
                                  </p>

                                  <p className="text-sm text-gray-700">
                                    {item.degree}

                                    {item.field_of_study
                                      ? ` in ${item.field_of_study}`
                                      : ""}

                                    {item.minor
                                      ? `, Minor in ${item.minor}`
                                      : ""}

                                    {item.gpa && (
                                      <> — GPA: {item.gpa}</>
                                    )}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right text-sm text-gray-600">
                                  {item.location && <p>{item.location}</p>}

                                  {item.graduation_date && (
                                    <p>
                                      Expected{" "}
                                      {formatResumeDate(item.graduation_date)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              

                              {item.coursework &&
                                item.coursework.length > 0 && (
                                  <p className="mt-1 text-sm text-gray-700">
                                    <span className="font-medium">
                                      Relevant Coursework:
                                    </span>{" "}
                                    {item.coursework.join(", ")}
                                  </p>
                                )}
                            </div>
                          ))}
                        </div>
                      )}

                      {(section.section_type === "skills" ||
  section.section_type === "technical_skills") && (
                        <div className="mt-2 space-y-0.5">
                          {section.items.map((item) => (
                            <p
                              key={item.category}
                              className="text-sm text-gray-700"
                            >
                              <span className="font-semibold text-gray-900">
                                {item.category}:
                              </span>{" "}
                              {item.skills.join(", ")}
                            </p>
                          ))}
                        </div>
                      )}

                      {section.section_type !== "education" &&
                        section.section_type !== "skills" &&
                        section.section_type !== "technical_skills" && (
                          <div className="mt-2 space-y-4">
                            {section.items.map((item) => (
                              <div key={item.id}>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {item.title}
                                    </p>

                                    {item.organization && (
                                      <p className="text-sm font-medium text-gray-700">
                                        {item.organization}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 text-right text-sm text-gray-600">
                                    {item.location && <p>{item.location}</p>}

                                    {item.start_date && (
                                      <p>
                                        {formatResumeDateRange(
                                          item.start_date,
                                          item.end_date,
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {item.bullets && item.bullets.length > 0 && (
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-gray-700">
                                    {item.bullets.map((bullet, index) => (
                                      <li key={index}>{bullet}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </section>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
