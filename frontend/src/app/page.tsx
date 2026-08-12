"use client";

import { useEffect, useState } from "react";
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
  null
);

const [editingApplicationId, setEditingApplicationId] =
  useState<number | null>(null);

const [applicationDeleteMessage, setApplicationDeleteMessage] =
  useState("");

const [applicationStatusFilter, setApplicationStatusFilter] =
  useState("All");
const [applicationSearch, setApplicationSearch] = useState("");

const [applicationSort, setApplicationSort] =
  useState("status");

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
    setApplicationDeleteMessage(
      "Application deleted successfully."
    );

    setTimeout(() => {
      setApplicationDeleteMessage("");
    }, 5000);
  } catch (error) {
  console.error(error);
    setApplicationDeleteMessage(
      "Unable to delete application."
    );

    setTimeout(() => {
      setApplicationDeleteMessage("");
    }, 5000);
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
          : experience
      )
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
    setFormMessage("Experience saved successfully.");

    setTimeout(() => {
      setFormMessage("");
    }, 5000);
    setBullets([""]);
 } catch (error) {
  console.error(error);
  setFormMessage("Unable to save experience.");
  setTimeout(() => {
    setFormMessage("");
  }, 5000);
 }
}

async function handleDeleteExperience(experienceId: number) {
  setFormMessage("");
  setDeleteMessage("");

  const confirmed = window.confirm(
    "Are you sure you want to delete this experience?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteExperience(experienceId);

    setExperiences((currentExperiences: any[]) =>
      currentExperiences.filter(
        (experience) => experience.id !== experienceId
      )
    );
    setDeleteMessage("Experience deleted successfully.");
    setTimeout(() => {
      setDeleteMessage("");
    }, 5000);
  } catch (error) {
    console.error(error);
    setDeleteMessage("Unable to delete experience.");
    setTimeout(() => {
      setDeleteMessage("");
    }, 5000);
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
    : [""]
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

  const formattedDate = new Date(
    Number(year),
    Number(month) - 1
  );

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
      "Company, job title, and job description are required."
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
            job.id === editingJobId ? savedJob : job
          )
    );

    setJobFormData({
      company: "",
      title: "",
      location: "",
      job_url: "",
      description: "",
    });
    setEditingJobId(null);
    setJobFormMessage("Job posting saved successfully.");

    setTimeout(() => {
      setJobFormMessage("");
    }, 5000);
  } catch (error) {
    console.error(error);
    setJobFormMessage("Unable to save job posting.");
    setTimeout(() => {
      setJobFormMessage("");
    }, 5000);
  }
}

async function handleDeleteJob(jobId: number) {
  setJobFormMessage("");
  setJobDeleteMessage("");

  const confirmed = window.confirm(
    "Are you sure you want to delete this job posting?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteJob(jobId);

    setJobs((currentJobs: any[]) =>
      currentJobs.filter((job) => job.id !== jobId)
    );
    setJobDeleteMessage("Job posting deleted successfully.");

    setTimeout(() => {
      setJobDeleteMessage("");
    }, 5000);
  } catch (error) {
    console.error(error);
    setJobDeleteMessage("Unable to delete job posting.");

    setTimeout(() => {
      setJobDeleteMessage("");
    }, 5000);
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
  setApplicationFormMessage(
    "Please select a job before tracking an application."
  );

  setTimeout(() => {
    setApplicationFormMessage("");
  }, 5000);

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
        : await updateApplication(
            editingApplicationId,
            applicationPayload
          );

    setApplications((currentApplications: any[]) =>
      editingApplicationId === null
        ? [...currentApplications, savedApplication]
        : currentApplications.map((application) =>
            application.id === editingApplicationId
              ? savedApplication
              : application
          )
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

    if (error instanceof Error) {
      setApplicationFormMessage(error.message);
    } else {
      setApplicationFormMessage(
        "Unable to track application."
      );
    }

    setTimeout(() => {
      setApplicationFormMessage("");
    }, 5000);
  }
}

async function handleDeleteApplication(applicationId: number) {
  setApplicationFormMessage("");
  setApplicationDeleteMessage("");

  const confirmed = window.confirm(
    "Are you sure you want to delete this application?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteApplication(applicationId);

    setApplications((currentApplications: any[]) =>
      currentApplications.filter(
        (application) => application.id !== applicationId
      )
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
    (application: any) => application.job_id === job.id
  );

  return (
    !existingApplication ||
    existingApplication.id === editingApplicationId
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

const sortedApplications = [...applications].sort(
  (a: any, b: any) => {
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
  }
);

const filteredApplications = sortedApplications.filter(
  (application: any) => {
    const matchesStatus =
      applicationStatusFilter === "All" ||
      application.status === applicationStatusFilter;

    const job = getJobForApplication(application.job_id);

    const searchText = applicationSearch.toLowerCase();

    const matchesSearch =
      !searchText ||
      job?.company?.toLowerCase().includes(searchText) ||
      job?.title?.toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  }
);

const applicationCounts = {
  total: applications.length,
  interested: applications.filter(
    (application: any) => application.status === "Interested"
  ).length,
  applied: applications.filter(
    (application: any) => application.status === "Applied"
  ).length,
  interview: applications.filter(
    (application: any) => application.status === "Interview"
  ).length,
  offer: applications.filter(
    (application: any) => application.status === "Offer"
  ).length,
  rejected: applications.filter(
    (application: any) => application.status === "Rejected"
  ).length,
  withdrawn: applications.filter(
    (application: any) => application.status === "Withdrawn"
  ).length,
};

function getDeadlineMessage(deadline: string | null) {
  if (!deadline) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(`${deadline}T00:00:00`);

  const differenceInMilliseconds =
    deadlineDate.getTime() - today.getTime();

  const daysRemaining = Math.ceil(
    differenceInMilliseconds / (1000 * 60 * 60 * 24)
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

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function handleClearApplicationFilters() {
  setApplicationStatusFilter("All");
  setApplicationSearch("");
  setApplicationSort("status");
}

return (
  <main className="p-8">
    <h1 className="text-3xl font-bold">Naomatch</h1>

    <p className="mt-4">
      Backend status: <strong>{status}</strong>
    </p>

    <button
      onClick={handleCheckBackend}
      className="mt-4 rounded bg-black px-4 py-2 text-white"
    >
      Check Backend
    </button>

    <form onSubmit={handleCreateExperience} className="mt-8 space-y-3">
      <h2 className="text-2xl font-semibold">Add Experience</h2>

      <input
        type="text"
        placeholder="Type"
        value={formData.type}
        onChange={(e) =>
          setFormData({ ...formData, type: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Organization"
        value={formData.organization}
        onChange={(e) =>
          setFormData({ ...formData, organization: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) =>
          setFormData({ ...formData, title: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Location"
        value={formData.location}
        onChange={(e) =>
          setFormData({ ...formData, location: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <div>
        <label className="mb-1 block text-sm font-medium">
          Start Date
        </label>

        <input
          type="date"
          value={formData.start_date}
          onChange={(e) =>
            setFormData({
              ...formData,
              start_date: e.target.value,
            })
          }
          className="block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          End Date
        </label>

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
          className="block w-full rounded border p-2"
        />
      </div>

      <label className="flex items-center gap-2">
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

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({
            ...formData,
            description: e.target.value,
          })
        }
        className="block w-full rounded border p-2"
      />

      <div className="space-y-2">
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
              className="block w-full rounded border p-2"
            />

            <button
              type="button"
              onClick={() => {
                const updatedBullets = bullets.filter(
                  (_, bulletIndex) => bulletIndex !== index
                );

                setBullets(
                  updatedBullets.length > 0
                    ? updatedBullets
                    : [""]
                );
              }}
              className="rounded border px-3"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setBullets([...bullets, ""])}
        className="rounded border px-3 py-1"
      >
        Add Bullet
      </button>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          {editingExperienceId === null
            ? "Add Experience"
            : "Save Changes"}
        </button>

        {editingExperienceId !== null && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>

      {formMessage && (
        <p className="text-sm">{formMessage}</p>
      )}
    </form>

    <div className="mt-8">
      <h2 className="text-2xl font-semibold">
        Experiences
      </h2>

      {deleteMessage && (
        <p className="mt-2 text-sm">
          {deleteMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-4">
          Loading experiences...
        </p>
      ) : error ? (
        <p className="mt-4">{error}</p>
      ) : experiences.length === 0 ? (
        <p className="mt-4">
          No experiences added yet.
        </p>
      ) : (
        experiences.map((experience: any) => (
          <div
            key={experience.id}
            className="mt-4 rounded border p-4"
          >
            <h3 className="text-xl font-bold">
              {experience.title}
            </h3>

            <p className="mt-1">
              {experience.organization}
              {experience.location
                ? ` • ${experience.location}`
                : ""}
            </p>

            <p className="text-sm">
              {experience.type} •{" "}
              {formatExperienceDate(
                experience.start_date
              )}
              {" - "}
              {formatExperienceDate(
                experience.end_date
              )}
            </p>

            <p className="mt-2">
              {experience.description}
            </p>

            {experience.bullets?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {experience.bullets.map(
                  (bullet: any) => (
                    <li key={bullet.id}>
                      {bullet.bullet_text}
                    </li>
                  )
                )}
              </ul>
            )}

            <button
              onClick={() =>
                handleEditExperience(experience)
              }
              className="mt-3 mr-2 rounded border px-3 py-1"
            >
              Edit
            </button>

            <button
              onClick={() =>
                handleDeleteExperience(
                  experience.id
                )
              }
              className="mt-3 rounded border px-3 py-1"
            >
              Delete
            </button>
          </div>
        ))
      )}

      <form
        onSubmit={handleCreateJob}
        className="mt-8 space-y-3"
      >
        <h2 className="text-2xl font-semibold">
          Add Job Posting
        </h2>

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
          className="block w-full rounded border p-2"
        />

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
          className="block w-full rounded border p-2"
        />

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
          className="block w-full rounded border p-2"
        />

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
          className="block w-full rounded border p-2"
        />

        <textarea
          placeholder="Job Description"
          value={jobFormData.description}
          onChange={(e) =>
            setJobFormData({
              ...jobFormData,
              description: e.target.value,
            })
          }
          className="block w-full rounded border p-2"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white"
          >
            {editingJobId === null
              ? "Add Job"
              : "Save Changes"}
          </button>

          {editingJobId !== null && (
            <button
              type="button"
              onClick={handleCancelJobEdit}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
          )}
        </div>

        {jobFormMessage && (
          <p className="text-sm">
            {jobFormMessage}
          </p>
        )}
      </form>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold">
          Jobs
        </h2>

        {jobDeleteMessage && (
          <p className="mt-2 text-sm">
            {jobDeleteMessage}
          </p>
        )}

        {jobs.length === 0 ? (
          <p className="mt-4">
            No job postings added yet.
          </p>
        ) : (
          jobs.map((job: any) => (
            <div
              key={job.id}
              className="mt-4 rounded border p-4"
            >
              <h3 className="text-xl font-bold">
                {job.title}
              </h3>

              <p>{job.company}</p>

              {job.location && (
                <p>{job.location}</p>
              )}

              {job.job_url && (
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block underline"
                >
                  View Job Posting
                </a>
              )}

              <p className="mt-2">
                {job.description}
              </p>

              <button
                onClick={() =>
                  handleEditJob(job)
                }
                className="mt-3 mr-2 rounded border px-3 py-1"
              >
                Edit
              </button>

              <button
                onClick={() =>
                  handleDeleteJob(job.id)
                }
                className="mt-3 rounded border px-3 py-1"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>

    <form
      onSubmit={handleCreateApplication}
      className="mt-8 space-y-3"
    >
      <h2 className="text-2xl font-semibold">
        Track Application
      </h2>

      <select
        value={applicationFormData.job_id}
        onChange={(e) =>
          setApplicationFormData({
            ...applicationFormData,
            job_id: e.target.value,
          })
        }
        className="block w-full rounded border p-2"
      >
        <option value="">
          Select a job
        </option>

     {availableJobsForApplication.map((job: any) => (
        <option key={job.id} value={job.id}>
          {job.company} — {job.title}
        </option>
      ))}
      </select>

      <select
        value={applicationFormData.status}
        onChange={(e) =>
          setApplicationFormData({
            ...applicationFormData,
            status: e.target.value,
          })
        }
        className="block w-full rounded border p-2"
      >
        <option value="Interested">
          Interested
        </option>
        <option value="Applied">
          Applied
        </option>
        <option value="Interview">
          Interview
        </option>
        <option value="Offer">
          Offer
        </option>
        <option value="Rejected">
          Rejected
        </option>
        <option value="Withdrawn">
          Withdrawn
        </option>
      </select>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Applied Date
        </label>

        <input
          type="date"
          value={applicationFormData.applied_date}
          onChange={(e) =>
            setApplicationFormData({
              ...applicationFormData,
              applied_date: e.target.value,
            })
          }
          className="block w-full rounded border p-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Application Due Date
        </label>

        <input
          type="date"
          value={applicationFormData.deadline}
          onChange={(e) =>
            setApplicationFormData({
              ...applicationFormData,
              deadline: e.target.value,
            })
          }
          className="block w-full rounded border p-2"
        />
      </div>

      <textarea
        placeholder="Notes"
        value={applicationFormData.notes}
        onChange={(e) =>
          setApplicationFormData({
            ...applicationFormData,
            notes: e.target.value,
          })
        }
        className="block w-full rounded border p-2"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          {editingApplicationId === null
            ? "Track Application"
            : "Save Changes"}
        </button>

        {editingApplicationId !== null && (
          <button
            type="button"
            onClick={handleCancelApplicationEdit}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
      {applicationFormMessage && (
        <p className="text-sm">
          {applicationFormMessage}
        </p>
      )}
    </form>

    <div className="mt-8">
      <h2 className="text-2xl font-semibold">
        Applications
      </h2>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <span>Total: {applicationCounts.total}</span>
        <span>Interested: {applicationCounts.interested}</span>
        <span>Applied: {applicationCounts.applied}</span>
        <span>Interviews: {applicationCounts.interview}</span>
        <span>Offers: {applicationCounts.offer}</span>
        <span>Rejected: {applicationCounts.rejected}</span>
        <span>Withdrawn: {applicationCounts.withdrawn}</span>
      </div>

      <select
        value={applicationStatusFilter}
        onChange={(e) => setApplicationStatusFilter(e.target.value)}
        className="mt-3 rounded border p-2"
      >
        <option value="All">All Statuses</option>
        <option value="Interested">Interested</option>
        <option value="Applied">Applied</option>
        <option value="Interview">Interview</option>
        <option value="Offer">Offer</option>
        <option value="Rejected">Rejected</option>
        <option value="Withdrawn">Withdrawn</option>
      </select>

      <select
        value={applicationSort}
        onChange={(e) => setApplicationSort(e.target.value)}
        className="mt-3 rounded border p-2"
      >
        <option value="status">Status Priority</option>
        <option value="deadline-soonest">Deadline: Soonest</option>
        <option value="deadline-latest">Deadline: Latest</option>
        <option value="recently-applied">Recently Applied</option>
      </select>

      <input
        type="text"
        placeholder="Search by company or job title"
        value={applicationSearch}
        onChange={(e) => setApplicationSearch(e.target.value)}
        className="mt-3 block w-full rounded border p-2"
      />

      <button
        type="button"
        onClick={handleClearApplicationFilters}
        className="mt-3 rounded border px-3 py-2"
      >
        Clear Filters
      </button>

      {applicationDeleteMessage && (
        <p className="mt-2 text-sm">
          {applicationDeleteMessage}
        </p>
      )}

      {applications.length === 0 ? (
        <p className="mt-4">
          No applications tracked yet.
        </p>
      ) : filteredApplications.length === 0 ? (
        <p className="mt-4">
          No applications match your current filters.
        </p>
      ) : (
        filteredApplications.map((application: any) => (
          <div
            key={application.id}
            className="mt-4 rounded border p-4"
          >
           <p>
            <strong>Status:</strong>{" "}
            <span
              className={`rounded px-2 py-1 text-sm font-medium ${getApplicationStatusClasses(
                application.status
              )}`}
            >
              {application.status}
            </span>
          </p>

            {application.applied_date && (
              <p>
                <strong>Applied:</strong>{" "}
                {formatApplicationDate(application.applied_date)}
              </p>
            )}

           {application.deadline && (
            <div>
              <p>
                <strong>Deadline:</strong>{" "}
                {formatApplicationDate(application.deadline)}
              </p>

              {getDeadlineMessage(application.deadline) && (
                <p className="text-sm font-medium">
                  {getDeadlineMessage(application.deadline)}
                </p>
              )}
            </div>
          )}

            {application.notes && (
              <p className="mt-2">
                <strong>Notes:</strong>{" "}
                {application.notes}
              </p>
            )}

            {(() => {
              const job = getJobForApplication(application.job_id);

              return (
                <div className="mt-2">
                  <p className="text-sm">
                    {job
                      ? `${job.company} — ${job.title}`
                      : `Job ID: ${application.job_id}`}
                  </p>

                  {job?.job_url && (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      View Job Posting
                    </a>
                  )}
                </div>
              );
            })()}
            <button
              onClick={() => handleEditApplication(application)}
              className="mt-3 mr-2 rounded border px-3 py-1"
            >
              Edit
            </button>

            <button
              onClick={() => handleDeleteApplication(application.id)}
              className="mt-3 rounded border px-3 py-1"
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  </main>
);
}