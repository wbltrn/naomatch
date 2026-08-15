"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  downloadReviewedResumePdf,
  getJob,
  getProfile,
  previewReviewedResume,
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

function cloneResume(resume: TailoredResumeResponse): TailoredResumeResponse {
  return structuredClone(resume);
}

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
  const [savingEdits, setSavingEdits] = useState(false);

  const [editingResume, setEditingResume] = useState(false);

  const [tailoredResume, setTailoredResume] =
    useState<TailoredResumeResponse | null>(null);

  const [resumeDraft, setResumeDraft] = useState<TailoredResumeResponse | null>(
    null,
  );

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false);

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

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  async function handleTailorResume() {
    try {
      setTailoring(true);
      setTailorError(null);
      setTailoredResume(null);
      setResumeDraft(null);
      setPreviewMetrics(null);
      setEditingResume(false);

      const data = await previewTailoredResume(jobId);

      setTailoredResume(data.resume);
      setPreviewMetrics(data);
      await refreshPdfPreview(data.resume);
    } catch (err) {
      console.error(err);

      setTailorError(
        err instanceof Error ? err.message : "Unable to tailor resume.",
      );
    } finally {
      setTailoring(false);
    }
  }

  function handleStartEditing() {
    if (!tailoredResume) {
      return;
    }

    setResumeDraft(cloneResume(tailoredResume));

    setEditingResume(true);
    setTailorError(null);
  }

  function handleCancelEditing() {
    setResumeDraft(null);
    setEditingResume(false);
    setTailorError(null);
  }

  function handleBulletChange(
    sectionIndex: number,
    itemIndex: number,
    bulletIndex: number,
    value: string,
  ) {
    setResumeDraft((current) => {
      if (!current) {
        return current;
      }

      const updated = cloneResume(current);

      const section = updated.sections[sectionIndex];

      const item = section.items[itemIndex];

      if ("bullets" in item && item.bullets) {
        item.bullets[bulletIndex] = value;
      }

      return updated;
    });
  }

  async function handleSaveEditing() {
    if (!resumeDraft) {
      return;
    }

    try {
      setSavingEdits(true);
      setTailorError(null);

      const data = await previewReviewedResume(jobId, resumeDraft);

      setTailoredResume(data.resume);
      setPreviewMetrics(data);
      await refreshPdfPreview(data.resume);

      setResumeDraft(null);
      setEditingResume(false);
    } catch (err) {
      console.error(err);

      setTailorError(
        err instanceof Error ? err.message : "Unable to save resume changes.",
      );
    } finally {
      setSavingEdits(false);
    }
  }

  async function refreshPdfPreview(resume: TailoredResumeResponse) {
    try {
      setLoadingPdfPreview(true);

      const pdfBlob = await downloadReviewedResumePdf(jobId, resume);

      const nextUrl = URL.createObjectURL(pdfBlob);

      setPdfPreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        return nextUrl;
      });
    } catch (err) {
      console.error(err);

      setTailorError(
        err instanceof Error ? err.message : "Unable to load resume preview.",
      );
    } finally {
      setLoadingPdfPreview(false);
    }
  }

  async function handleDownloadPdf() {
    if (!tailoredResume) {
      return;
    }

    try {
      setDownloadingPdf(true);
      setTailorError(null);

      const pdfBlob = await downloadReviewedResumePdf(jobId, tailoredResume);

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

  const displayedResume =
    editingResume && resumeDraft ? resumeDraft : tailoredResume;

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
                    disabled={
                      tailoring ||
                      downloadingPdf ||
                      savingEdits ||
                      editingResume
                    }
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
                      Selecting the strongest experience, projects, and skills
                      for {job.company} and fitting everything to one page.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {displayedResume !== null && (
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

                    <div className="flex flex-wrap gap-2">
                      {!editingResume && (
                        <button
                          type="button"
                          onClick={handleStartEditing}
                          disabled={downloadingPdf || tailoring}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit Resume
                        </button>
                      )}

                      {editingResume && (
                        <>
                          <button
                            type="button"
                            onClick={handleCancelEditing}
                            disabled={savingEdits}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveEditing}
                            disabled={savingEdits}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingEdits && (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            )}

                            {savingEdits ? "Saving..." : "Save Changes"}
                          </button>
                        </>
                      )}

                      {!editingResume && (
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={downloadingPdf || tailoring}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadingPdf && (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          )}

                          {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
                        </button>
                      )}
                    </div>
                  </div>

                  {editingResume ? (
                    <p className="mt-3 text-xs text-gray-500">
                      Edit the generated bullet points below. Your Vault will
                      not be changed.
                    </p>
                  ) : (
                    previewMetrics && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                        {previewMetrics.page_count === 1 && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Optimized for one page
                          </span>
                        )}

                        <span>Ready to review and download</span>
                      </div>
                    )
                  )}
                </div>

                {!editingResume && (
                  <div className="mx-auto w-full max-w-[850px]">
                    {loadingPdfPreview && (
                      <div className="flex aspect-[17/22] items-center justify-center border border-gray-300 bg-white shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                          Loading exact PDF preview...
                        </div>
                      </div>
                    )}

                    {!loadingPdfPreview && pdfPreviewUrl && (
                      <iframe
                        src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        title="Tailored resume PDF preview"
                        className="aspect-[17/22] w-full border border-gray-300 bg-white shadow-sm"
                      />
                    )}

                    {!loadingPdfPreview && !pdfPreviewUrl && (
                      <div className="flex aspect-[17/22] items-center justify-center border border-gray-300 bg-white text-sm text-gray-500 shadow-sm">
                        PDF preview unavailable.
                      </div>
                    )}
                  </div>
                )}

                {editingResume && (
                  <div className="mx-auto w-full max-w-[850px] border border-gray-300 bg-white px-8 py-8 shadow-sm">
                    {profile && (
                      <header className="mb-5 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                          {profile.name}
                        </h1>

                        <div className="mt-1 flex flex-wrap justify-center text-xs text-gray-700">
                          {profile.phone && <span>{profile.phone}</span>}

                          {profile.email && (
                            <>
                              {profile.phone && (
                                <span className="mx-1.5">|</span>
                              )}

                              <a
                                href={`mailto:${profile.email}`}
                                className="hover:underline"
                              >
                                {profile.email}
                              </a>
                            </>
                          )}

                          {profile.links.map((link) => (
                            <span key={`${link.label}-${link.url}`}>
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

                    {displayedResume.sections.map((section, sectionIndex) => (
                      <section
                        key={section.section_type}
                        className="mb-5 last:mb-0"
                      >
                        <h3 className="border-b border-gray-900 pb-0.5 text-sm font-semibold uppercase tracking-wide text-gray-900">
                          {section.title}
                        </h3>

                        {section.section_type === "education" && (
                          <div className="mt-2 space-y-3">
                            {section.items.map((item, index) => (
                              <div
                                key={
                                  item.id ?? `${section.section_type}-${index}`
                                }
                              >
                                <div className="flex items-baseline justify-between gap-4">
                                  <p className="font-semibold text-gray-900">
                                    {item.school}
                                  </p>

                                  {item.location && (
                                    <p className="shrink-0 text-sm text-gray-600">
                                      {item.location}
                                    </p>
                                  )}
                                </div>

                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                                  <p className="whitespace-nowrap text-[13px] text-gray-700">
                                    {item.degree}

                                    {item.field_of_study && (
                                      <> in {item.field_of_study}</>
                                    )}

                                    {item.minor && <>, Minor in {item.minor}</>}

                                    {item.gpa && (
                                      <>
                                        {" — "}
                                        <span>GPA: {item.gpa}</span>
                                      </>
                                    )}
                                  </p>

                                  {item.graduation_date && (
                                    <p className="whitespace-nowrap text-[13px] italic text-gray-600">
                                      {formatResumeDate(item.graduation_date)}
                                    </p>
                                  )}
                                </div>

                                {item.coursework &&
                                  item.coursework.length > 0 && (
                                    <ul className="mt-1 list-disc pl-5 text-sm leading-5 text-gray-700">
                                      <li>
                                        <span className="font-semibold">
                                          Relevant Coursework:
                                        </span>{" "}
                                        {item.coursework.join(", ")}
                                      </li>
                                    </ul>
                                  )}

                                {item.honors && item.honors.length > 0 && (
                                  <ul className="mt-1 list-disc pl-5 text-sm leading-5 text-gray-700">
                                    <li>
                                      <span className="font-semibold">
                                        Honors:
                                      </span>{" "}
                                      {item.honors.join(", ")}
                                    </li>
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {(section.section_type === "skills" ||
                          section.section_type === "technical_skills") && (
                          <div className="mt-2 space-y-0.5">
                            {section.items.map((item, index) => (
                              <p
                                key={
                                  item.category ??
                                  `${section.section_type}-${index}`
                                }
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

                        {(section.section_type === "projects" ||
                          section.section_type === "project") && (
                          <div className="mt-2 space-y-4">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={
                                  item.id ??
                                  `${section.section_type}-${itemIndex}`
                                }
                              >
                                <div className="flex items-baseline justify-between gap-4">
                                  <p className="font-semibold text-gray-900">
                                    {item.name ?? item.title}

                                    {item.technologies &&
                                      item.technologies.length > 0 && (
                                        <span className="font-normal italic text-gray-700">
                                          {" "}
                                          | {item.technologies.join(", ")}
                                        </span>
                                      )}
                                  </p>

                                  {(item.date || item.start_date) && (
                                    <p className="shrink-0 text-sm text-gray-600">
                                      {item.date
                                        ? formatResumeDate(item.date)
                                        : formatResumeDateRange(
                                            item.start_date,
                                            item.end_date,
                                          )}
                                    </p>
                                  )}
                                </div>

                                {item.bullets && item.bullets.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {item.bullets.map((bullet, bulletIndex) =>
                                      editingResume ? (
                                        <div
                                          key={bulletIndex}
                                          className="flex gap-2"
                                        >
                                          <span className="pt-2 text-sm text-gray-500">
                                            •
                                          </span>

                                          <textarea
                                            value={bullet}
                                            onChange={(event) =>
                                              handleBulletChange(
                                                sectionIndex,
                                                itemIndex,
                                                bulletIndex,
                                                event.target.value,
                                              )
                                            }
                                            rows={3}
                                            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-5 text-gray-700 outline-none transition focus:border-gray-500"
                                          />
                                        </div>
                                      ) : (
                                        <ul
                                          key={bulletIndex}
                                          className="list-disc pl-5 text-sm leading-5 text-gray-700"
                                        >
                                          <li>{bullet}</li>
                                        </ul>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {section.section_type !== "education" &&
                          section.section_type !== "skills" &&
                          section.section_type !== "technical_skills" &&
                          section.section_type !== "projects" &&
                          section.section_type !== "project" && (
                            <div className="mt-2 space-y-4">
                              {section.items.map((item, itemIndex) => (
                                <div
                                  key={
                                    item.id ??
                                    `${section.section_type}-${itemIndex}`
                                  }
                                >
                                  <div className="flex items-baseline justify-between gap-4">
                                    <p className="font-semibold text-gray-900">
                                      {item.title}
                                    </p>

                                    {item.start_date && (
                                      <p className="shrink-0 text-sm text-gray-600">
                                        {formatResumeDateRange(
                                          item.start_date,
                                          item.end_date,
                                        )}
                                      </p>
                                    )}
                                  </div>

                                  {(item.organization || item.location) && (
                                    <div className="flex items-baseline justify-between gap-4">
                                      <p className="text-sm italic text-gray-700">
                                        {item.organization}
                                      </p>

                                      {item.location && (
                                        <p className="shrink-0 text-sm italic text-gray-600">
                                          {item.location}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {item.bullets && item.bullets.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {item.bullets.map(
                                        (bullet, bulletIndex) =>
                                          editingResume ? (
                                            <div
                                              key={bulletIndex}
                                              className="flex gap-2"
                                            >
                                              <span className="pt-2 text-sm text-gray-500">
                                                •
                                              </span>

                                              <textarea
                                                value={bullet}
                                                onChange={(event) =>
                                                  handleBulletChange(
                                                    sectionIndex,
                                                    itemIndex,
                                                    bulletIndex,
                                                    event.target.value,
                                                  )
                                                }
                                                rows={3}
                                                className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-5 text-gray-700 outline-none transition focus:border-gray-500"
                                              />
                                            </div>
                                          ) : (
                                            <ul
                                              key={bulletIndex}
                                              className="list-disc pl-5 text-sm leading-5 text-gray-700"
                                            >
                                              <li>{bullet}</li>
                                            </ul>
                                          ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </section>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
