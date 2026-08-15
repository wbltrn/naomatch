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
  type TailoredEducationItem,
  type TailoredResumeItem,
  type TailoredResumeResponse,
  type TailoredSkillGroup,
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

type EducationField =
  | "school"
  | "degree"
  | "field_of_study"
  | "minor"
  | "location"
  | "gpa"
  | "graduation_date";

type ResumeItemField =
  | "title"
  | "organization"
  | "location"
  | "start_date"
  | "end_date"
  | "name"
  | "date";

function cloneResume(resume: TailoredResumeResponse): TailoredResumeResponse {
  return structuredClone(resume);
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function educationListKey(
  sectionIndex: number,
  itemIndex: number,
  field: "coursework" | "honors",
) {
  return `${sectionIndex}-${itemIndex}-${field}`;
}

function technologiesKey(sectionIndex: number, itemIndex: number) {
  return `${sectionIndex}-${itemIndex}-technologies`;
}

function skillsKey(sectionIndex: number, itemIndex: number) {
  return `${sectionIndex}-${itemIndex}-skills`;
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

  const [listDrafts, setListDrafts] = useState<Record<string, string>>({});

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
      setListDrafts({});
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

    const draft = cloneResume(tailoredResume);
    const nextListDrafts: Record<string, string> = {};

    draft.sections.forEach((section, sectionIndex) => {
      if (section.section_type === "education") {
        section.items.forEach((item, itemIndex) => {
          nextListDrafts[
            educationListKey(sectionIndex, itemIndex, "coursework")
          ] = (item.coursework ?? []).join(", ");

          nextListDrafts[educationListKey(sectionIndex, itemIndex, "honors")] =
            (item.honors ?? []).join(", ");
        });
      }

      if (
        section.section_type === "projects" ||
        section.section_type === "project"
      ) {
        section.items.forEach((item, itemIndex) => {
          nextListDrafts[technologiesKey(sectionIndex, itemIndex)] = (
            item.technologies ?? []
          ).join(", ");
        });
      }

      if (
        section.section_type === "skills" ||
        section.section_type === "technical_skills"
      ) {
        section.items.forEach((item, itemIndex) => {
          nextListDrafts[skillsKey(sectionIndex, itemIndex)] =
            item.skills.join(", ");
        });
      }
    });

    setResumeDraft(draft);
    setListDrafts(nextListDrafts);
    setEditingResume(true);
    setTailorError(null);
  }

  function handleCancelEditing() {
    setResumeDraft(null);
    setListDrafts({});
    setEditingResume(false);
    setTailorError(null);
  }

  function handleEducationFieldChange(
    sectionIndex: number,
    itemIndex: number,
    field: EducationField,
    value: string,
  ) {
    setResumeDraft((current) => {
      if (!current) {
        return current;
      }

      const updated = cloneResume(current);
      const section = updated.sections[sectionIndex];

      if (section.section_type !== "education") {
        return current;
      }

      const item = section.items[itemIndex] as TailoredEducationItem;

      if (field === "school") {
        item.school = value;
      } else {
        item[field] = value || null;
      }

      return updated;
    });
  }

  function handleEducationListChange(
    sectionIndex: number,
    itemIndex: number,
    field: "coursework" | "honors",
    value: string,
  ) {
    setListDrafts((current) => ({
      ...current,
      [educationListKey(sectionIndex, itemIndex, field)]: value,
    }));
  }

  function handleResumeItemFieldChange(
    sectionIndex: number,
    itemIndex: number,
    field: ResumeItemField,
    value: string,
  ) {
    setResumeDraft((current) => {
      if (!current) {
        return current;
      }

      const updated = cloneResume(current);
      const section = updated.sections[sectionIndex];

      if (
        section.section_type === "education" ||
        section.section_type === "skills" ||
        section.section_type === "technical_skills"
      ) {
        return current;
      }

      const item = section.items[itemIndex] as TailoredResumeItem;

      item[field] = value || null;

      return updated;
    });
  }

  function handleTechnologiesChange(
    sectionIndex: number,
    itemIndex: number,
    value: string,
  ) {
    setListDrafts((current) => ({
      ...current,
      [technologiesKey(sectionIndex, itemIndex)]: value,
    }));
  }

  function handleSkillGroupChange(
    sectionIndex: number,
    itemIndex: number,
    field: "category" | "skills",
    value: string,
  ) {
    if (field === "skills") {
      setListDrafts((current) => ({
        ...current,
        [skillsKey(sectionIndex, itemIndex)]: value,
      }));

      return;
    }

    setResumeDraft((current) => {
      if (!current) {
        return current;
      }

      const updated = cloneResume(current);
      const section = updated.sections[sectionIndex];

      if (
        section.section_type !== "skills" &&
        section.section_type !== "technical_skills"
      ) {
        return current;
      }

      const item = section.items[itemIndex] as TailoredSkillGroup;

      item.category = value;

      return updated;
    });
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

  function prepareResumeForSave(
    draft: TailoredResumeResponse,
  ): TailoredResumeResponse {
    const cleaned = cloneResume(draft);

    cleaned.sections.forEach((section, sectionIndex) => {
      section.title = section.title.trim();

      if (section.section_type === "education") {
        section.items.forEach((item, itemIndex) => {
          item.school = item.school.trim();

          if (!item.school) {
            throw new Error("Education entries must include a school.");
          }

          item.degree = item.degree?.trim() || null;

          item.field_of_study = item.field_of_study?.trim() || null;

          item.minor = item.minor?.trim() || null;

          item.location = item.location?.trim() || null;

          item.gpa = item.gpa?.trim() || null;

          item.graduation_date = item.graduation_date?.trim() || null;

          item.coursework = splitCommaSeparated(
            listDrafts[
              educationListKey(sectionIndex, itemIndex, "coursework")
            ] ?? "",
          );

          item.honors = splitCommaSeparated(
            listDrafts[educationListKey(sectionIndex, itemIndex, "honors")] ??
              "",
          );
        });

        return;
      }

      if (
        section.section_type === "skills" ||
        section.section_type === "technical_skills"
      ) {
        section.items.forEach((item, itemIndex) => {
          item.category = item.category.trim();

          if (!item.category) {
            throw new Error("Skill groups must include a category.");
          }

          item.skills = splitCommaSeparated(
            listDrafts[skillsKey(sectionIndex, itemIndex)] ?? "",
          );

          if (item.skills.length === 0) {
            throw new Error(
              `The "${item.category}" skill group must contain at least one skill.`,
            );
          }
        });

        return;
      }

      section.items.forEach((item, itemIndex) => {
        item.title = item.title?.trim() || null;

        item.name = item.name?.trim() || null;

        item.organization = item.organization?.trim() || null;

        item.location = item.location?.trim() || null;

        item.start_date = item.start_date?.trim() || null;

        item.end_date = item.end_date?.trim() || null;

        item.date = item.date?.trim() || null;

        item.bullets = (item.bullets ?? [])
          .map((bullet) => bullet.trim())
          .filter(Boolean);

        if (
          section.section_type === "projects" ||
          section.section_type === "project"
        ) {
          if (!item.name && !item.title) {
            throw new Error("Project entries must include a project name.");
          }

          item.technologies = splitCommaSeparated(
            listDrafts[technologiesKey(sectionIndex, itemIndex)] ?? "",
          );

          return;
        }

        if (!item.title) {
          throw new Error(`${section.title} entries must include a title.`);
        }
      });
    });

    return cleaned;
  }

  async function handleSaveEditing() {
    if (!resumeDraft) {
      return;
    }

    try {
      setSavingEdits(true);
      setTailorError(null);

      const cleanedResume = prepareResumeForSave(resumeDraft);

      const data = await previewReviewedResume(jobId, cleanedResume);

      setTailoredResume(data.resume);
      setPreviewMetrics(data);

      await refreshPdfPreview(data.resume);

      setResumeDraft(null);
      setListDrafts({});
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

  const displayedResume =
    editingResume && resumeDraft ? resumeDraft : tailoredResume;

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-gray-500";

  const labelClass = "mb-1 block text-xs font-medium text-gray-500";

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
                      Edit the tailored copy below. Your Vault will not be
                      changed.
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
                  <div className="mx-auto w-full max-w-[850px] space-y-5 border border-gray-300 bg-white px-8 py-8 shadow-sm">
                    {profile && (
                      <header className="text-center">
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
                      <section key={section.section_type} className="space-y-3">
                        <h3 className="border-b border-gray-900 pb-0.5 text-sm font-semibold uppercase tracking-wide text-gray-900">
                          {section.title}
                        </h3>

                        {section.section_type === "education" && (
                          <div className="space-y-4">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={
                                  item.id ??
                                  `${section.section_type}-${itemIndex}`
                                }
                                className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-2"
                              >
                                {[
                                  ["School", "school", item.school],
                                  ["Location", "location", item.location ?? ""],
                                  ["Degree", "degree", item.degree ?? ""],
                                  [
                                    "Field of Study",
                                    "field_of_study",
                                    item.field_of_study ?? "",
                                  ],
                                  ["Minor", "minor", item.minor ?? ""],
                                  ["GPA", "gpa", item.gpa ?? ""],
                                ].map(([label, field, value]) => (
                                  <label key={field}>
                                    <span className={labelClass}>{label}</span>

                                    <input
                                      className={inputClass}
                                      value={value}
                                      onChange={(event) =>
                                        handleEducationFieldChange(
                                          sectionIndex,
                                          itemIndex,
                                          field as EducationField,
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                ))}

                                <label>
                                  <span className={labelClass}>
                                    Graduation Date
                                  </span>

                                  <input
                                    type="date"
                                    className={inputClass}
                                    value={item.graduation_date ?? ""}
                                    onChange={(event) =>
                                      handleEducationFieldChange(
                                        sectionIndex,
                                        itemIndex,
                                        "graduation_date",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label className="sm:col-span-2">
                                  <span className={labelClass}>Coursework</span>

                                  <input
                                    className={inputClass}
                                    value={
                                      listDrafts[
                                        educationListKey(
                                          sectionIndex,
                                          itemIndex,
                                          "coursework",
                                        )
                                      ] ?? ""
                                    }
                                    onChange={(event) =>
                                      handleEducationListChange(
                                        sectionIndex,
                                        itemIndex,
                                        "coursework",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label className="sm:col-span-2">
                                  <span className={labelClass}>Honors</span>

                                  <input
                                    className={inputClass}
                                    value={
                                      listDrafts[
                                        educationListKey(
                                          sectionIndex,
                                          itemIndex,
                                          "honors",
                                        )
                                      ] ?? ""
                                    }
                                    onChange={(event) =>
                                      handleEducationListChange(
                                        sectionIndex,
                                        itemIndex,
                                        "honors",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        {(section.section_type === "skills" ||
                          section.section_type === "technical_skills") && (
                          <div className="space-y-3">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={`${section.section_type}-${itemIndex}`}
                                className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-[220px_1fr]"
                              >
                                <label>
                                  <span className={labelClass}>Category</span>

                                  <input
                                    className={inputClass}
                                    value={item.category}
                                    onChange={(event) =>
                                      handleSkillGroupChange(
                                        sectionIndex,
                                        itemIndex,
                                        "category",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span className={labelClass}>Skills</span>

                                  <input
                                    className={inputClass}
                                    value={
                                      listDrafts[
                                        skillsKey(sectionIndex, itemIndex)
                                      ] ?? ""
                                    }
                                    onChange={(event) =>
                                      handleSkillGroupChange(
                                        sectionIndex,
                                        itemIndex,
                                        "skills",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        {(section.section_type === "projects" ||
                          section.section_type === "project") && (
                          <div className="space-y-4">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={
                                  item.id ??
                                  `${section.section_type}-${itemIndex}`
                                }
                                className="space-y-3 rounded-lg border border-gray-200 p-4"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label>
                                    <span className={labelClass}>
                                      Project Name
                                    </span>

                                    <input
                                      className={inputClass}
                                      value={item.name ?? item.title ?? ""}
                                      onChange={(event) =>
                                        handleResumeItemFieldChange(
                                          sectionIndex,
                                          itemIndex,
                                          "name" in item ? "name" : "title",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    <span className={labelClass}>
                                      Technologies
                                    </span>

                                    <input
                                      className={inputClass}
                                      value={
                                        listDrafts[
                                          technologiesKey(
                                            sectionIndex,
                                            itemIndex,
                                          )
                                        ] ?? ""
                                      }
                                      onChange={(event) =>
                                        handleTechnologiesChange(
                                          sectionIndex,
                                          itemIndex,
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>

                                  {[
                                    ["Project Date", "date", item.date ?? ""],
                                    [
                                      "Start Date",
                                      "start_date",
                                      item.start_date ?? "",
                                    ],
                                    [
                                      "End Date",
                                      "end_date",
                                      item.end_date ?? "",
                                    ],
                                  ].map(([label, field, value]) => (
                                    <label key={field}>
                                      <span className={labelClass}>
                                        {label}
                                      </span>

                                      <input
                                        type="date"
                                        className={inputClass}
                                        value={value}
                                        onChange={(event) =>
                                          handleResumeItemFieldChange(
                                            sectionIndex,
                                            itemIndex,
                                            field as ResumeItemField,
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>

                                {item.bullets && item.bullets.length > 0 && (
                                  <div className="space-y-2">
                                    <span className={labelClass}>Bullets</span>

                                    {item.bullets.map((bullet, bulletIndex) => (
                                      <textarea
                                        key={bulletIndex}
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
                                        className={`${inputClass} resize-y leading-5`}
                                      />
                                    ))}
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
                            <div className="space-y-4">
                              {section.items.map((item, itemIndex) => (
                                <div
                                  key={
                                    item.id ??
                                    `${section.section_type}-${itemIndex}`
                                  }
                                  className="space-y-3 rounded-lg border border-gray-200 p-4"
                                >
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                      ["Title", "title", item.title ?? ""],
                                      [
                                        "Organization",
                                        "organization",
                                        item.organization ?? "",
                                      ],
                                      [
                                        "Location",
                                        "location",
                                        item.location ?? "",
                                      ],
                                    ].map(([label, field, value]) => (
                                      <label key={field}>
                                        <span className={labelClass}>
                                          {label}
                                        </span>

                                        <input
                                          className={inputClass}
                                          value={value}
                                          onChange={(event) =>
                                            handleResumeItemFieldChange(
                                              sectionIndex,
                                              itemIndex,
                                              field as ResumeItemField,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                    ))}

                                    {[
                                      [
                                        "Start Date",
                                        "start_date",
                                        item.start_date ?? "",
                                      ],
                                      [
                                        "End Date",
                                        "end_date",
                                        item.end_date ?? "",
                                      ],
                                    ].map(([label, field, value]) => (
                                      <label key={field}>
                                        <span className={labelClass}>
                                          {label}
                                        </span>

                                        <input
                                          type="date"
                                          className={inputClass}
                                          value={value}
                                          onChange={(event) =>
                                            handleResumeItemFieldChange(
                                              sectionIndex,
                                              itemIndex,
                                              field as ResumeItemField,
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                    ))}
                                  </div>

                                  {item.bullets && item.bullets.length > 0 && (
                                    <div className="space-y-2">
                                      <span className={labelClass}>
                                        Bullets
                                      </span>

                                      {item.bullets.map(
                                        (bullet, bulletIndex) => (
                                          <textarea
                                            key={bulletIndex}
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
                                            className={`${inputClass} resize-y leading-5`}
                                          />
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
