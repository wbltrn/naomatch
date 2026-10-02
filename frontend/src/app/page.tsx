"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  checkBackend,
  createApplication,
  createExperience,
  createJob,
  deleteExperience,
  deleteJob,
  getApplications,
  getExperiences,
  getJobs,
  updateExperience,
  updateJob,
  deleteApplication,
  updateApplication,
} from "@/lib/api";

import ResumeImport from "@/components/ResumeImport";

export default function Home() {
  const [status, setStatus] = useState("Not checked");
  const [experiences, setExperiences] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    organization: "",
    title: "",
    location: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const [jobFormData, setJobFormData] = useState({
    company: "",
    title: "",
    location: "",
    job_url: "",
    description: "",
  });

  const [applicationFormData, setApplicationFormData] = useState({
    job_id: "",
    status: "Interested",
    applied_date: "",
    deadline: "",
    notes: "",
  });

  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(
    null,
  );

  const [editingApplicationId, setEditingApplicationId] = useState<
    number | null
  >(null);

  const [applicationDeleteMessage, setApplicationDeleteMessage] = useState("");

  const [applicationStatusFilter, setApplicationStatusFilter] = useState("All");
  const [applicationSearch, setApplicationSearch] = useState("");

  const [applicationSort, setApplicationSort] = useState("status");

  const [deadlineFilter, setDeadlineFilter] = useState("all");

  const [bullets, setBullets] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jobFormMessage, setJobFormMessage] = useState("");
  const [jobDeleteMessage, setJobDeleteMessage] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationFormMessage, setApplicationFormMessage] = useState("");

  const messageTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  // Submitting the same form again before a prior auto-clear timer fires
  // would otherwise let the old timer wipe out the newer message early.
  function showTemporaryMessage(
    key: string,
    setMessage: (value: string) => void,
    message: string,
  ) {
    setMessage(message);

    if (messageTimeouts.current[key]) {
      clearTimeout(messageTimeouts.current[key]);
    }

    messageTimeouts.current[key] = setTimeout(() => {
      setMessage("");
    }, 5000);
  }

  useEffect(() => {
    async function loadExperiences() {
      try {
        const data = await getExperiences();
        setExperiences(data);
        setError("");
      } catch {
        setError("Unable to load experiences.");
      } finally {
        setLoading(false);
      }
    }

    async function loadJobs() {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error(error);
      }
    }

    async function loadApplications() {
      try {
        const data = await getApplications();
        setApplications(data);

        showTemporaryMessage(
          "applicationDelete",
          setApplicationDeleteMessage,
          "Application deleted successfully.",
        );
      } catch (error) {
        console.error(error);

        showTemporaryMessage(
          "applicationDelete",
          setApplicationDeleteMessage,
          "Unable to delete application.",
        );
      }
    }

    loadExperiences();
    loadJobs();
    loadApplications();
  }, []);

  async function handleCheckBackend() {
    try {
      const data = await checkBackend();
      setStatus(data.status);
    } catch {
      setStatus("Backend unavailable");
    }
  }

  async function handleCreateExperience(event: React.FormEvent) {
    event.preventDefault();

    setFormMessage("");
    setDeleteMessage("");

    if (!formData.type.trim() || !formData.title.trim()) {
      setFormMessage("Type and title are required.");
      return;
    }

    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      setFormMessage("End date cannot be before start date.");
      return;
    }

    try {
      const savedExperience =
        editingExperienceId === null
          ? await createExperience({
              ...formData,
              end_date: isCurrent ? null : formData.end_date || null,
              bullets: bullets
                .filter((bullet) => bullet.trim() !== "")
                .map((bullet) => ({
                  bullet_text: bullet.trim(),
                })),
            })
          : await updateExperience(editingExperienceId, {
              ...formData,
              end_date: isCurrent ? null : formData.end_date || null,
              bullets: bullets
                .filter((bullet) => bullet.trim() !== "")
                .map((bullet) => ({
                  bullet_text: bullet.trim(),
                })),
            });

      setExperiences((currentExperiences: any[]) =>
        editingExperienceId === null
          ? [...currentExperiences, savedExperience]
          : currentExperiences.map((experience) =>
              experience.id === editingExperienceId
                ? savedExperience
                : experience,
            ),
      );

      setFormData({
        type: "",
        organization: "",
        title: "",
        location: "",
        start_date: "",
        end_date: "",
        description: "",
      });
      setEditingExperienceId(null);
      setIsCurrent(false);

      showTemporaryMessage(
        "form",
        setFormMessage,
        "Experience saved successfully.",
      );
      setBullets([""]);
    } catch (error) {
      console.error(error);

      showTemporaryMessage("form", setFormMessage, "Unable to save experience.");
    }
  }

  async function handleDeleteExperience(experienceId: number) {
    setFormMessage("");
    setDeleteMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this experience?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteExperience(experienceId);

      setExperiences((currentExperiences: any[]) =>
        currentExperiences.filter(
          (experience) => experience.id !== experienceId,
        ),
      );
      showTemporaryMessage(
        "delete",
        setDeleteMessage,
        "Experience deleted successfully.",
      );
    } catch (error) {
      console.error(error);

      showTemporaryMessage(
        "delete",
        setDeleteMessage,
        "Unable to delete experience.",
      );
    }
  }

  function handleEditExperience(experience: any) {
    setEditingExperienceId(experience.id);

    setFormData({
      type: experience.type ?? "",
      organization: experience.organization ?? "",
      title: experience.title ?? "",
      location: experience.location ?? "",
      start_date: experience.start_date ?? "",
      end_date: experience.end_date ?? "",
      description: experience.description ?? "",
    });
    setBullets(
      experience.bullets?.length > 0
        ? experience.bullets.map((bullet: any) => bullet.bullet_text)
        : [""],
    );
    setIsCurrent(!experience.end_date);
  }

  function handleCancelEdit() {
    setEditingExperienceId(null);
    setIsCurrent(false);

    setFormData({
      type: "",
      organization: "",
      title: "",
      location: "",
      start_date: "",
      end_date: "",
      description: "",
    });

    setBullets([""]);
  }

  function formatExperienceDate(date: string | null) {
    if (!date) {
      return "Present";
    }

    const [year, month] = date.split("-");

    const formattedDate = new Date(Number(year), Number(month) - 1);

    return formattedDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  function handleEditJob(job: any) {
    setEditingJobId(job.id);

    setJobFormData({
      company: job.company ?? "",
      title: job.title ?? "",
      location: job.location ?? "",
      job_url: job.job_url ?? "",
      description: job.description ?? "",
    });
  }

  async function handleCreateJob(event: React.FormEvent) {
    event.preventDefault();
    setJobFormMessage("");
    setJobDeleteMessage("");

    if (
      !jobFormData.company.trim() ||
      !jobFormData.title.trim() ||
      !jobFormData.description.trim()
    ) {
      setJobFormMessage(
        "Company, job title, and job description are required.",
      );
      return;
    }

    try {
      const jobPayload = {
        ...jobFormData,
        job_url: jobFormData.job_url.trim() || null,
      };

      const savedJob =
        editingJobId === null
          ? await createJob(jobPayload)
          : await updateJob(editingJobId, jobPayload);

      setJobs((currentJobs: any[]) =>
        editingJobId === null
          ? [...currentJobs, savedJob]
          : currentJobs.map((job) =>
              job.id === editingJobId ? savedJob : job,
            ),
      );

      setJobFormData({
        company: "",
        title: "",
        location: "",
        job_url: "",
        description: "",
      });
      setEditingJobId(null);

      showTemporaryMessage(
        "jobForm",
        setJobFormMessage,
        "Job posting saved successfully.",
      );
    } catch (error) {
      console.error(error);

      showTemporaryMessage(
        "jobForm",
        setJobFormMessage,
        "Unable to save job posting.",
      );
    }
  }

  async function handleDeleteJob(jobId: number) {
    setJobFormMessage("");
    setJobDeleteMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this job posting?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteJob(jobId);

      setJobs((currentJobs: any[]) =>
        currentJobs.filter((job) => job.id !== jobId),
      );
      showTemporaryMessage(
        "jobDelete",
        setJobDeleteMessage,
        "Job posting deleted successfully.",
      );
    } catch (error) {
      console.error(error);

      showTemporaryMessage(
        "jobDelete",
        setJobDeleteMessage,
        "Unable to delete job posting.",
      );
    }
  }

  function handleCancelJobEdit() {
    setEditingJobId(null);

    setJobFormData({
      company: "",
      title: "",
      location: "",
      job_url: "",
      description: "",
    });
  }

  function handleEditApplication(application: any) {
    setEditingApplicationId(application.id);

    setApplicationFormData({
      job_id: String(application.job_id),
      status: application.status ?? "Interested",
      applied_date: application.applied_date ?? "",
      deadline: application.deadline ?? "",
      notes: application.notes ?? "",
    });
  }

  async function handleCreateApplication(event: React.FormEvent) {
    event.preventDefault();
    setApplicationFormMessage("");
    setApplicationDeleteMessage("");

    if (!applicationFormData.job_id) {
      showTemporaryMessage(
        "applicationForm",
        setApplicationFormMessage,
        "Please select a job before tracking an application.",
      );

      return;
    }

    try {
      const applicationPayload = {
        status: applicationFormData.status,
        applied_date: applicationFormData.applied_date || null,
        deadline: applicationFormData.deadline || null,
        notes: applicationFormData.notes.trim() || null,
      };

      const savedApplication =
        editingApplicationId === null
          ? await createApplication({
              job_id: Number(applicationFormData.job_id),
              ...applicationPayload,
            })
          : await updateApplication(editingApplicationId, applicationPayload);

      setApplications((currentApplications: any[]) =>
        editingApplicationId === null
          ? [...currentApplications, savedApplication]
          : currentApplications.map((application) =>
              application.id === editingApplicationId
                ? savedApplication
                : application,
            ),
      );

      setApplicationFormData({
        job_id: "",
        status: "Interested",
        applied_date: "",
        deadline: "",
        notes: "",
      });
      setEditingApplicationId(null);
      setApplicationFormMessage("");
    } catch (error) {
      console.error(error);

      showTemporaryMessage(
        "applicationForm",
        setApplicationFormMessage,
        error instanceof Error ? error.message : "Unable to track application.",
      );
    }
  }

  async function handleDeleteApplication(applicationId: number) {
    setApplicationFormMessage("");
    setApplicationDeleteMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this application?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteApplication(applicationId);

      setApplications((currentApplications: any[]) =>
        currentApplications.filter(
          (application) => application.id !== applicationId,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }

  function handleCancelApplicationEdit() {
    setEditingApplicationId(null);
    setApplicationFormMessage("");

    setApplicationFormData({
      job_id: "",
      status: "Interested",
      applied_date: "",
      deadline: "",
      notes: "",
    });
  }

  function getJobForApplication(jobId: number) {
    return jobs.find((job: any) => job.id === jobId);
  }

  const availableJobsForApplication = jobs.filter((job: any) => {
    const existingApplication = applications.find(
      (application: any) => application.job_id === job.id,
    );

    return (
      !existingApplication || existingApplication.id === editingApplicationId
    );
  });

  function getApplicationStatusClasses(status: string) {
    switch (status) {
      case "Interested":
        return "bg-gray-100 text-gray-800";
      case "Applied":
        return "bg-blue-100 text-blue-800";
      case "Interview":
        return "bg-yellow-100 text-yellow-800";
      case "Offer":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Withdrawn":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  const applicationStatusOrder: Record<string, number> = {
    Interview: 1,
    Offer: 2,
    Applied: 3,
    Interested: 4,
    Rejected: 5,
    Withdrawn: 6,
  };

  const sortedApplications = [...applications].sort((a: any, b: any) => {
    if (applicationSort === "deadline-soonest") {
      if (!a.deadline && !b.deadline) {
        return 0;
      }

      if (!a.deadline) {
        return 1;
      }

      if (!b.deadline) {
        return -1;
      }

      return (
        new Date(`${a.deadline}T00:00:00`).getTime() -
        new Date(`${b.deadline}T00:00:00`).getTime()
      );
    }

    if (applicationSort === "deadline-latest") {
      if (!a.deadline && !b.deadline) {
        return 0;
      }

      if (!a.deadline) {
        return 1;
      }

      if (!b.deadline) {
        return -1;
      }

      return (
        new Date(`${b.deadline}T00:00:00`).getTime() -
        new Date(`${a.deadline}T00:00:00`).getTime()
      );
    }

    if (applicationSort === "recently-applied") {
      if (!a.applied_date && !b.applied_date) {
        return 0;
      }

      if (!a.applied_date) {
        return 1;
      }

      if (!b.applied_date) {
        return -1;
      }

      return (
        new Date(`${b.applied_date}T00:00:00`).getTime() -
        new Date(`${a.applied_date}T00:00:00`).getTime()
      );
    }

    const statusDifference =
      (applicationStatusOrder[a.status] ?? 99) -
      (applicationStatusOrder[b.status] ?? 99);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (!a.deadline && !b.deadline) {
      return 0;
    }

    if (!a.deadline) {
      return 1;
    }

    if (!b.deadline) {
      return -1;
    }

    return (
      new Date(`${a.deadline}T00:00:00`).getTime() -
      new Date(`${b.deadline}T00:00:00`).getTime()
    );
  });

  const filteredApplications = sortedApplications.filter((application: any) => {
    const matchesStatus =
      applicationStatusFilter === "All" ||
      application.status === applicationStatusFilter;

    const job = getJobForApplication(application.job_id);

    const searchText = applicationSearch.toLowerCase();

    const matchesSearch =
      !searchText ||
      job?.company?.toLowerCase().includes(searchText) ||
      job?.title?.toLowerCase().includes(searchText);

    let matchesDeadline = true;

    if (deadlineFilter === "no-deadline") {
      matchesDeadline = !application.deadline;
    } else if (deadlineFilter !== "all") {
      if (!application.deadline) {
        matchesDeadline = false;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlineDate = new Date(`${application.deadline}T00:00:00`);

        const differenceInMilliseconds =
          deadlineDate.getTime() - today.getTime();

        const daysRemaining = Math.ceil(
          differenceInMilliseconds / (1000 * 60 * 60 * 24),
        );

        if (deadlineFilter === "due-today") {
          matchesDeadline = daysRemaining === 0;
        }

        if (deadlineFilter === "due-soon") {
          matchesDeadline = daysRemaining >= 0 && daysRemaining <= 7;
        }

        if (deadlineFilter === "due-30") {
          matchesDeadline = daysRemaining >= 0 && daysRemaining <= 30;
        }

        if (deadlineFilter === "past-due") {
          matchesDeadline = daysRemaining < 0;
        }
      }
    }

    return matchesStatus && matchesSearch && matchesDeadline;
  });

  const applicationCounts = {
    total: applications.length,
    interested: applications.filter(
      (application: any) => application.status === "Interested",
    ).length,
    applied: applications.filter(
      (application: any) => application.status === "Applied",
    ).length,
    interview: applications.filter(
      (application: any) => application.status === "Interview",
    ).length,
    offer: applications.filter(
      (application: any) => application.status === "Offer",
    ).length,
    rejected: applications.filter(
      (application: any) => application.status === "Rejected",
    ).length,
    withdrawn: applications.filter(
      (application: any) => application.status === "Withdrawn",
    ).length,

    overdue: applications.filter((application: any) => {
      if (!application.deadline) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deadlineDate = new Date(`${application.deadline}T00:00:00`);

      return deadlineDate < today;
    }).length,

    dueToday: applications.filter((application: any) => {
      if (!application.deadline) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deadlineDate = new Date(`${application.deadline}T00:00:00`);

      return deadlineDate.getTime() === today.getTime();
    }).length,
  };

  function getDeadlineMessage(deadline: string | null) {
    if (!deadline) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(`${deadline}T00:00:00`);

    const differenceInMilliseconds = deadlineDate.getTime() - today.getTime();

    const daysRemaining = Math.ceil(
      differenceInMilliseconds / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 0) {
      return "Deadline passed";
    }

    if (daysRemaining === 0) {
      return "Due today";
    }

    if (daysRemaining === 1) {
      return "Due tomorrow";
    }

    if (daysRemaining <= 7) {
      return `Due in ${daysRemaining} days`;
    }

    return null;
  }

  function formatApplicationDate(date: string | null) {
    if (!date) {
      return "";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleClearApplicationFilters() {
    setApplicationStatusFilter("All");
    setApplicationSearch("");
    setApplicationSort("status");
    setDeadlineFilter("all");
  }

  const hasActiveApplicationFilters =
    applicationStatusFilter !== "All" ||
    applicationSearch.trim() !== "" ||
    applicationSort !== "status" ||
    deadlineFilter !== "all";

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-gray-500";

  const selectClass =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-gray-500";

  const labelClass = "mb-1 block text-xs font-medium text-gray-500";

  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60";

  const smallButtonClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50";

  const smallDestructiveButtonClass =
    "rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50";

  const cardClass = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm";

  const itemCardClass = "rounded-lg border border-gray-200 bg-white p-4";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Naomatch
          </h1>

          <p className="mt-2 max-w-2xl text-gray-600">
            Keep your Experience Vault up to date, add job postings, and
            track your applications.
          </p>

          <Link
            href="/vault"
            className={`mt-4 ${secondaryButtonClass}`}
          >
            Open Experience Vault
          </Link>
        </header>

        <section className="mb-10">
          <ResumeImport />
        </section>

        <section className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className={labelClass}>Backend status</p>
            <p className="text-lg font-semibold text-gray-900">{status}</p>
          </div>

          <button onClick={handleCheckBackend} className={secondaryButtonClass}>
            Check Backend
          </button>
        </section>

        <section className="mb-10">
          <form
            onSubmit={handleCreateExperience}
            className={`${cardClass} space-y-4`}
          >
            <h2 className="text-2xl font-semibold text-gray-900">
              Add Experience
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Type</span>

                <input
                  type="text"
                  placeholder="Type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Organization</span>

                <input
                  type="text"
                  placeholder="Organization"
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Title</span>

                <input
                  type="text"
                  placeholder="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Location</span>

                <input
                  type="text"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Start Date</span>

                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      start_date: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>End Date</span>

                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      end_date: e.target.value,
                    })
                  }
                  disabled={isCurrent}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsCurrent(checked);

                  if (checked) {
                    setFormData({
                      ...formData,
                      end_date: "",
                    });
                  }
                }}
              />
              Currently working here
            </label>

            <label>
              <span className={labelClass}>Description</span>

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className={`${inputClass} resize-y`}
              />
            </label>

            <div className="space-y-2">
              <span className={labelClass}>Resume Bullets</span>

              {bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Resume bullet ${index + 1}`}
                    value={bullet}
                    onChange={(e) => {
                      const updatedBullets = [...bullets];
                      updatedBullets[index] = e.target.value;
                      setBullets(updatedBullets);
                    }}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const updatedBullets = bullets.filter(
                        (_, bulletIndex) => bulletIndex !== index,
                      );

                      setBullets(
                        updatedBullets.length > 0 ? updatedBullets : [""],
                      );
                    }}
                    className={smallDestructiveButtonClass}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setBullets([...bullets, ""])}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add Bullet
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass}>
                {editingExperienceId === null ? "Add Experience" : "Save Changes"}
              </button>

              {editingExperienceId !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              )}
            </div>

            {formMessage && (
              <p className="text-sm text-gray-600">{formMessage}</p>
            )}
          </form>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">
            Experiences
          </h2>

          {deleteMessage && (
            <p className="mb-3 text-sm text-gray-600">{deleteMessage}</p>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Loading experiences...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : experiences.length === 0 ? (
            <p className="text-sm text-gray-500">No experiences added yet.</p>
          ) : (
            <div className="space-y-4">
              {experiences.map((experience: any) => (
                <div key={experience.id} className={itemCardClass}>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {experience.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    {experience.organization}
                    {experience.location ? ` • ${experience.location}` : ""}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {experience.type} •{" "}
                    {formatExperienceDate(experience.start_date)}
                    {" - "}
                    {formatExperienceDate(experience.end_date)}
                  </p>

                  {experience.description && (
                    <p className="mt-2 text-sm text-gray-700">
                      {experience.description}
                    </p>
                  )}

                  {experience.bullets?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {experience.bullets.map((bullet: any) => (
                        <li key={bullet.id}>{bullet.bullet_text}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEditExperience(experience)}
                      className={smallButtonClass}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteExperience(experience.id)}
                      className={smallDestructiveButtonClass}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <form
            onSubmit={handleCreateJob}
            className={`${cardClass} space-y-4`}
          >
            <h2 className="text-2xl font-semibold text-gray-900">
              Add Job Posting
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Company</span>

                <input
                  type="text"
                  placeholder="Company"
                  value={jobFormData.company}
                  onChange={(e) =>
                    setJobFormData({
                      ...jobFormData,
                      company: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Job Title</span>

                <input
                  type="text"
                  placeholder="Job Title"
                  value={jobFormData.title}
                  onChange={(e) =>
                    setJobFormData({
                      ...jobFormData,
                      title: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Location</span>

                <input
                  type="text"
                  placeholder="Location"
                  value={jobFormData.location}
                  onChange={(e) =>
                    setJobFormData({
                      ...jobFormData,
                      location: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Job URL</span>

                <input
                  type="text"
                  placeholder="Job URL"
                  value={jobFormData.job_url}
                  onChange={(e) =>
                    setJobFormData({
                      ...jobFormData,
                      job_url: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <label>
              <span className={labelClass}>Job Description</span>

              <textarea
                placeholder="Job Description"
                value={jobFormData.description}
                onChange={(e) =>
                  setJobFormData({
                    ...jobFormData,
                    description: e.target.value,
                  })
                }
                className={`${inputClass} resize-y`}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass}>
                {editingJobId === null ? "Add Job" : "Save Changes"}
              </button>

              {editingJobId !== null && (
                <button
                  type="button"
                  onClick={handleCancelJobEdit}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              )}
            </div>

            {jobFormMessage && (
              <p className="text-sm text-gray-600">{jobFormMessage}</p>
            )}
          </form>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Jobs</h2>

          {jobDeleteMessage && (
            <p className="mb-3 text-sm text-gray-600">{jobDeleteMessage}</p>
          )}

          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No job postings added yet.</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: any) => (
                <div key={job.id} className={itemCardClass}>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {job.title}
                  </h3>

                  <p className="text-sm text-gray-600">{job.company}</p>

                  {job.location && (
                    <p className="text-sm text-gray-500">{job.location}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium text-gray-900 underline hover:no-underline"
                    >
                      Tailor Resume →
                    </Link>

                    {job.job_url && (
                      <a
                        href={job.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 underline hover:no-underline"
                      >
                        View Job Posting
                      </a>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-700">
                    {job.description}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEditJob(job)}
                      className={smallButtonClass}
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className={smallDestructiveButtonClass}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <form
            onSubmit={handleCreateApplication}
            className={`${cardClass} space-y-4`}
          >
            <h2 className="text-2xl font-semibold text-gray-900">
              Track Application
            </h2>

            <label>
              <span className={labelClass}>Job</span>

              <select
                value={applicationFormData.job_id}
                onChange={(e) =>
                  setApplicationFormData({
                    ...applicationFormData,
                    job_id: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">Select a job</option>

                {availableJobsForApplication.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.company} — {job.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Status</span>

              <select
                value={applicationFormData.status}
                onChange={(e) =>
                  setApplicationFormData({
                    ...applicationFormData,
                    status: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="Interested">Interested</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Applied Date</span>

                <input
                  type="date"
                  value={applicationFormData.applied_date}
                  onChange={(e) =>
                    setApplicationFormData({
                      ...applicationFormData,
                      applied_date: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>Application Due Date</span>

                <input
                  type="date"
                  value={applicationFormData.deadline}
                  onChange={(e) =>
                    setApplicationFormData({
                      ...applicationFormData,
                      deadline: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <label>
              <span className={labelClass}>Notes</span>

              <textarea
                placeholder="Notes"
                value={applicationFormData.notes}
                onChange={(e) =>
                  setApplicationFormData({
                    ...applicationFormData,
                    notes: e.target.value,
                  })
                }
                className={`${inputClass} resize-y`}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass}>
                {editingApplicationId === null
                  ? "Track Application"
                  : "Save Changes"}
              </button>

              {editingApplicationId !== null && (
                <button
                  type="button"
                  onClick={handleCancelApplicationEdit}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              )}
            </div>

            {applicationFormMessage && (
              <p className="text-sm text-gray-600">{applicationFormMessage}</p>
            )}
          </form>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">
            Applications
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <button
              type="button"
              onClick={handleClearApplicationFilters}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <p className={labelClass}>Total Applications</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {applicationCounts.total}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setApplicationStatusFilter("Applied");
                setDeadlineFilter("all");
              }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <p className={labelClass}>Applied</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {applicationCounts.applied}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setApplicationStatusFilter("Interview");
                setDeadlineFilter("all");
              }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <p className={labelClass}>Interviews</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {applicationCounts.interview}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setApplicationStatusFilter("Offer");
                setDeadlineFilter("all");
              }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <p className={labelClass}>Offers</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {applicationCounts.offer}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setApplicationStatusFilter("All");
                setDeadlineFilter("past-due");
              }}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <p className={labelClass}>Overdue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {applicationCounts.overdue}
              </p>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label>
              <span className={labelClass}>Status</span>

              <select
                value={applicationStatusFilter}
                onChange={(e) => setApplicationStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="All">All Statuses</option>
                <option value="Interested">Interested</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </label>

            <label>
              <span className={labelClass}>Sort</span>

              <select
                value={applicationSort}
                onChange={(e) => setApplicationSort(e.target.value)}
                className={selectClass}
              >
                <option value="status">Status Priority</option>
                <option value="deadline-soonest">Deadline: Soonest</option>
                <option value="deadline-latest">Deadline: Latest</option>
                <option value="recently-applied">Recently Applied</option>
              </select>
            </label>

            <label>
              <span className={labelClass}>Deadline</span>

              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All Deadlines</option>
                <option value="due-today">Due Today</option>
                <option value="due-soon">Due Within 7 Days</option>
                <option value="due-30">Due Within 30 Days</option>
                <option value="past-due">Past Due</option>
                <option value="no-deadline">No Deadline</option>
              </select>
            </label>

            <label className="min-w-[220px] flex-1">
              <span className={labelClass}>Search</span>

              <input
                type="text"
                placeholder="Search by company or job title"
                value={applicationSearch}
                onChange={(e) => setApplicationSearch(e.target.value)}
                className={inputClass}
              />
            </label>

            <button
              type="button"
              onClick={handleClearApplicationFilters}
              className={secondaryButtonClass}
            >
              Clear Filters
            </button>
          </div>

          {hasActiveApplicationFilters && (
            <p className="mt-3 text-sm text-gray-500">Filters are active.</p>
          )}

          {applicationDeleteMessage && (
            <p className="mt-2 text-sm text-gray-600">
              {applicationDeleteMessage}
            </p>
          )}

          <div className="mt-4">
            {applications.length === 0 ? (
              <p className="text-sm text-gray-500">
                No applications tracked yet.
              </p>
            ) : filteredApplications.length === 0 ? (
              <p className="text-sm text-gray-500">
                No applications match your current filters.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application: any) => (
                  <div key={application.id} className={itemCardClass}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        Status:
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getApplicationStatusClasses(
                          application.status,
                        )}`}
                      >
                        {application.status}
                      </span>
                    </div>

                    {application.applied_date && (
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          Applied:
                        </span>{" "}
                        {formatApplicationDate(application.applied_date)}
                      </p>
                    )}

                    {application.deadline && (
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-gray-900">
                            Deadline:
                          </span>{" "}
                          {formatApplicationDate(application.deadline)}
                        </p>

                        {getDeadlineMessage(application.deadline) && (
                          <p className="mt-0.5 text-xs font-medium text-amber-600">
                            {getDeadlineMessage(application.deadline)}
                          </p>
                        )}
                      </div>
                    )}

                    {application.notes && (
                      <p className="mt-2 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">
                          Notes:
                        </span>{" "}
                        {application.notes}
                      </p>
                    )}

                    {(() => {
                      const job = getJobForApplication(application.job_id);

                      return (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {job
                              ? `${job.company} — ${job.title}`
                              : `Job ID: ${application.job_id}`}
                          </p>

                          {job?.job_url && (
                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-600 underline hover:no-underline"
                            >
                              View Job Posting
                            </a>
                          )}
                        </div>
                      );
                    })()}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEditApplication(application)}
                        className={smallButtonClass}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteApplication(application.id)}
                        className={smallDestructiveButtonClass}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
