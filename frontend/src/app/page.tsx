"use client";

import { useEffect, useState } from "react";
import {
  checkBackend,
  createExperience,
  createJob,
  deleteExperience,
  deleteJob,
  getExperiences,
  getJobs,
  updateExperience,
  updateJob,
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

const [editingExperienceId, setEditingExperienceId] = useState<number | null>(
  null
);

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

  loadExperiences();
  loadJobs();
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
    setBullets([""]);
 } catch (error) {
  console.error(error);
  setFormMessage("Unable to save experience.");
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
  } catch (error) {
    console.error(error);
    setDeleteMessage("Unable to delete experience.");
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
  } catch (error) {
    console.error(error);
    setJobFormMessage("Unable to save job posting.");
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
  } catch (error) {
    console.error(error);
    setJobDeleteMessage("Unable to delete job posting.");
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

      <input
        type="date"
        value={formData.start_date}
        onChange={(e) =>
          setFormData({ ...formData, start_date: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="date"
        value={formData.end_date}
        onChange={(e) =>
          setFormData({ ...formData, end_date: e.target.value })
        }
        disabled={isCurrent}
        className="block w-full rounded border p-2"
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => {
            const checked = e.target.checked;
            setIsCurrent(checked);

            if (checked) {
              setFormData({ ...formData, end_date: "" });
            }
          }}
        />
        Currently working here
      </label>

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
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
                  updatedBullets.length > 0 ? updatedBullets : [""]
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
          {editingExperienceId === null ? "Add Experience" : "Save Changes"}
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
        <p className="text-sm">
          {formMessage}
        </p>
      )}

    </form>

    <div className="mt-8">
      <h2 className="text-2xl font-semibold">Experiences</h2>

      {deleteMessage && (
        <p className="mt-2 text-sm">
          {deleteMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-4">Loading experiences...</p>
      ) : error ? (
        <p className="mt-4">{error}</p>
      ) : experiences.length === 0 ? (
        <p className="mt-4">No experiences added yet.</p>
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
              {experience.location ? ` • ${experience.location}` : ""}
            </p>

            <p className="text-sm">
              {experience.type} • {formatExperienceDate(experience.start_date)}
              {" - "}
              {formatExperienceDate(experience.end_date)}
            </p>

            <p className="mt-2">{experience.description}</p>

            {experience.bullets?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {experience.bullets.map((bullet: any) => (
                  <li key={bullet.id}>{bullet.bullet_text}</li>
                ))}
              </ul>
            )}

            <button
              onClick={() => handleEditExperience(experience)}
              className="mt-3 mr-2 rounded border px-3 py-1"
            >
              Edit
            </button>

            <button
              onClick={() => handleDeleteExperience(experience.id)}
              className="mt-3 rounded border px-3 py-1"
            >
              Delete
            </button>
          </div>
        ))
      )}

      <form onSubmit={handleCreateJob} className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">Add Job Posting</h2>

        <input
          type="text"
          placeholder="Company"
          value={jobFormData.company}
          onChange={(e) =>
            setJobFormData({ ...jobFormData, company: e.target.value })
          }
          className="block w-full rounded border p-2"
        />

        <input
          type="text"
          placeholder="Job Title"
          value={jobFormData.title}
          onChange={(e) =>
            setJobFormData({ ...jobFormData, title: e.target.value })
          }
          className="block w-full rounded border p-2"
        />

        <input
          type="text"
          placeholder="Location"
          value={jobFormData.location}
          onChange={(e) =>
            setJobFormData({ ...jobFormData, location: e.target.value })
          }
          className="block w-full rounded border p-2"
        />

        <input
          type="text"
          placeholder="Job URL"
          value={jobFormData.job_url}
          onChange={(e) =>
            setJobFormData({ ...jobFormData, job_url: e.target.value })
          }
          className="block w-full rounded border p-2"
        />

        <textarea
          placeholder="Job Description"
          value={jobFormData.description}
          onChange={(e) =>
            setJobFormData({ ...jobFormData, description: e.target.value })
          }
          className="block w-full rounded border p-2"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white"
          >
            {editingJobId === null ? "Add Job" : "Save Changes"}
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
        <h2 className="text-2xl font-semibold">Jobs</h2>

        {jobDeleteMessage && (
          <p className="mt-2 text-sm">
            {jobDeleteMessage}
          </p>
        )}

        {jobs.length === 0 ? (
          <p className="mt-4">No job postings added yet.</p>
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
                onClick={() => handleEditJob(job)}
                className="mt-3 mr-2 rounded border px-3 py-1"
              >
                Edit
              </button>

              <button
                onClick={() => handleDeleteJob(job.id)}
                className="mt-3 rounded border px-3 py-1"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  </main>
);
}