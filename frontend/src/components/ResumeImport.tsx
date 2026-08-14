"use client";

import { useState } from "react";

import {
  confirmResumeImport,
  ResumeImportProposal,
  uploadResumeForImport,
} from "@/lib/api";

export default function ResumeImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [proposal, setProposal] = useState<ResumeImportProposal | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please choose a resume first.");
      return;
    }

    setLoading(true);
    setError(null);
    setConfirmMessage(null);
    setProposal(null);

    try {
      const result = await uploadResumeForImport(selectedFile);

      setProposal(result.proposal);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to import resume",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!proposal) {
      return;
    }
    const confirmed = window.confirm(
      "Add this reviewed resume information to your vault?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setConfirmMessage(null);

    try {
      await confirmResumeImport(proposal);

      setConfirmMessage("Resume information added to your vault.");

      setProposal(null);
      setSelectedFile(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to confirm resume import",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Import Resume</h2>

        <p className="text-sm text-gray-600">
          Upload a PDF or DOCX resume. Naomatch will extract and organize the
          information for review before anything is added to your vault.
        </p>

        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;

            setSelectedFile(file);
          }}
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={loading || !selectedFile}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Parsing Resume..." : "Upload Resume"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {confirmMessage && (
          <p className="text-sm text-green-600">{confirmMessage}</p>
        )}
      </div>

      {proposal && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Review Import</h3>

            <p className="text-sm text-gray-600">
              Nothing has been added to your vault yet.
            </p>
          </div>

          {/* Profile */}
          <div className="rounded-md border p-4">
            <h4 className="mb-4 text-lg font-semibold">Profile</h4>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                placeholder="Name"
                value={proposal.profile.name ?? ""}
                onChange={(event) =>
                  setProposal({
                    ...proposal,
                    profile: {
                      ...proposal.profile,
                      name: event.target.value,
                    },
                  })
                }
                className="rounded border p-2"
              />

              <input
                type="text"
                placeholder="Phone"
                value={proposal.profile.phone ?? ""}
                onChange={(event) =>
                  setProposal({
                    ...proposal,
                    profile: {
                      ...proposal.profile,
                      phone: event.target.value,
                    },
                  })
                }
                className="rounded border p-2"
              />

              <input
                type="email"
                placeholder="Email"
                value={proposal.profile.email ?? ""}
                onChange={(event) =>
                  setProposal({
                    ...proposal,
                    profile: {
                      ...proposal.profile,
                      email: event.target.value,
                    },
                  })
                }
                className="rounded border p-2 md:col-span-2"
              />
              {/* Links */}
              <div className="mt-4 space-y-3 md:col-span-2">
                <h4 className="font-medium">Links</h4>

                {proposal.profile.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url ?? ""}
                      onChange={(event) => {
                        const updatedLinks = [...proposal.profile.links];

                        updatedLinks[index] = {
                          ...link,
                          url: event.target.value,
                          label: event.target.value
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, ""),
                        };

                        setProposal({
                          ...proposal,
                          profile: {
                            ...proposal.profile,
                            links: updatedLinks,
                          },
                        });
                      }}
                      className="w-full rounded border p-2"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const updatedLinks = proposal.profile.links.filter(
                          (_, linkIndex) => linkIndex !== index,
                        );

                        setProposal({
                          ...proposal,
                          profile: {
                            ...proposal.profile,
                            links: updatedLinks,
                          },
                        });
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setProposal({
                      ...proposal,
                      profile: {
                        ...proposal.profile,
                        links: [
                          ...proposal.profile.links,
                          {
                            label: "",
                            url: "",
                          },
                        ],
                      },
                    });
                  }}
                  className="rounded border px-3 py-1"
                >
                  Add Link
                </button>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="rounded-md border p-4">
            <h4 className="mb-4 text-lg font-semibold">Education</h4>

            <div className="space-y-6">
              {proposal.education.map((education, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="School"
                    value={education.school ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        school: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Degree"
                    value={education.degree ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        degree: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Field of Study"
                    value={education.field_of_study ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        field_of_study: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Minor"
                    value={education.minor ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        minor: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Location"
                    value={education.location ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        location: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="GPA"
                    value={education.gpa ?? ""}
                    onChange={(event) => {
                      const updatedEducation = [...proposal.education];

                      updatedEducation[index] = {
                        ...education,
                        gpa: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        education: updatedEducation,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <div>
                    <label className="mb-1 block text-sm">Start Date</label>

                    <input
                      type="date"
                      value={education.start_date ?? ""}
                      onChange={(event) => {
                        const updatedEducation = [...proposal.education];

                        updatedEducation[index] = {
                          ...education,
                          start_date: event.target.value || null,
                        };

                        setProposal({
                          ...proposal,
                          education: updatedEducation,
                        });
                      }}
                      className="w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm">
                      Graduation Date
                    </label>

                    <input
                      type="date"
                      value={education.graduation_date ?? ""}
                      onChange={(event) => {
                        const updatedEducation = [...proposal.education];

                        updatedEducation[index] = {
                          ...education,
                          graduation_date: event.target.value || null,
                        };

                        setProposal({
                          ...proposal,
                          education: updatedEducation,
                        });
                      }}
                      className="w-full rounded border p-2"
                    />
                  </div>
                  {/* Coursework */}
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium">Coursework</p>

                    {education.coursework.map((course, courseIndex) => (
                      <div key={courseIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={course}
                          onChange={(event) => {
                            const updatedEducation = [...proposal.education];
                            const updatedCoursework = [...education.coursework];

                            updatedCoursework[courseIndex] = event.target.value;

                            updatedEducation[index] = {
                              ...education,
                              coursework: updatedCoursework,
                            };

                            setProposal({
                              ...proposal,
                              education: updatedEducation,
                            });
                          }}
                          className="w-full rounded border p-2"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const updatedEducation = [...proposal.education];

                            const updatedCoursework =
                              education.coursework.filter(
                                (_, currentIndex) =>
                                  currentIndex !== courseIndex,
                              );

                            updatedEducation[index] = {
                              ...education,
                              coursework: updatedCoursework,
                            };

                            setProposal({
                              ...proposal,
                              education: updatedEducation,
                            });
                          }}
                          className="rounded border px-3"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const updatedEducation = [...proposal.education];

                        updatedEducation[index] = {
                          ...education,
                          coursework: [...education.coursework, ""],
                        };

                        setProposal({
                          ...proposal,
                          education: updatedEducation,
                        });
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Add Course
                    </button>
                  </div>

                  {/* Honors */}
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium">Honors</p>

                    {education.honors.map((honor, honorIndex) => (
                      <div key={honorIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={honor}
                          onChange={(event) => {
                            const updatedEducation = [...proposal.education];
                            const updatedHonors = [...education.honors];

                            updatedHonors[honorIndex] = event.target.value;

                            updatedEducation[index] = {
                              ...education,
                              honors: updatedHonors,
                            };

                            setProposal({
                              ...proposal,
                              education: updatedEducation,
                            });
                          }}
                          className="w-full rounded border p-2"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const updatedEducation = [...proposal.education];

                            const updatedHonors = education.honors.filter(
                              (_, currentIndex) => currentIndex !== honorIndex,
                            );

                            updatedEducation[index] = {
                              ...education,
                              honors: updatedHonors,
                            };

                            setProposal({
                              ...proposal,
                              education: updatedEducation,
                            });
                          }}
                          className="rounded border px-3"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const updatedEducation = [...proposal.education];

                        updatedEducation[index] = {
                          ...education,
                          honors: [...education.honors, ""],
                        };

                        setProposal({
                          ...proposal,
                          education: updatedEducation,
                        });
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Add Honor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experiences */}
          <div className="rounded-md border p-4">
            <h4 className="mb-4 text-lg font-semibold">Experiences</h4>

            <div className="space-y-6">
              {proposal.experiences.map((experience, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Type"
                    value={experience.type ?? ""}
                    onChange={(event) => {
                      const updatedExperiences = [...proposal.experiences];

                      updatedExperiences[index] = {
                        ...experience,
                        type: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        experiences: updatedExperiences,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Title"
                    value={experience.title ?? ""}
                    onChange={(event) => {
                      const updatedExperiences = [...proposal.experiences];

                      updatedExperiences[index] = {
                        ...experience,
                        title: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        experiences: updatedExperiences,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Organization"
                    value={experience.organization ?? ""}
                    onChange={(event) => {
                      const updatedExperiences = [...proposal.experiences];

                      updatedExperiences[index] = {
                        ...experience,
                        organization: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        experiences: updatedExperiences,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Location"
                    value={experience.location ?? ""}
                    onChange={(event) => {
                      const updatedExperiences = [...proposal.experiences];

                      updatedExperiences[index] = {
                        ...experience,
                        location: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        experiences: updatedExperiences,
                      });
                    }}
                    className="rounded border p-2"
                  />

                  <div>
                    <label className="mb-1 block text-sm">Start Date</label>

                    <input
                      type="date"
                      value={experience.start_date ?? ""}
                      onChange={(event) => {
                        const updatedExperiences = [...proposal.experiences];

                        updatedExperiences[index] = {
                          ...experience,
                          start_date: event.target.value || null,
                        };

                        setProposal({
                          ...proposal,
                          experiences: updatedExperiences,
                        });
                      }}
                      className="w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm">End Date</label>

                    <input
                      type="date"
                      value={experience.end_date ?? ""}
                      onChange={(event) => {
                        const updatedExperiences = [...proposal.experiences];

                        updatedExperiences[index] = {
                          ...experience,
                          end_date: event.target.value || null,
                        };

                        setProposal({
                          ...proposal,
                          experiences: updatedExperiences,
                        });
                      }}
                      className="w-full rounded border p-2"
                    />
                  </div>

                  <textarea
                    placeholder="Description"
                    value={experience.description ?? ""}
                    onChange={(event) => {
                      const updatedExperiences = [...proposal.experiences];

                      updatedExperiences[index] = {
                        ...experience,
                        description: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        experiences: updatedExperiences,
                      });
                    }}
                    className="rounded border p-2 md:col-span-2"
                  />

                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium">Bullets</p>

                    {experience.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={bullet}
                          onChange={(event) => {
                            const updatedExperiences = [
                              ...proposal.experiences,
                            ];

                            const updatedBullets = [...experience.bullets];

                            updatedBullets[bulletIndex] = event.target.value;

                            updatedExperiences[index] = {
                              ...experience,
                              bullets: updatedBullets,
                            };

                            setProposal({
                              ...proposal,
                              experiences: updatedExperiences,
                            });
                          }}
                          className="w-full rounded border p-2"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const updatedExperiences = [
                              ...proposal.experiences,
                            ];

                            const updatedBullets = experience.bullets.filter(
                              (_, currentIndex) => currentIndex !== bulletIndex,
                            );

                            updatedExperiences[index] = {
                              ...experience,
                              bullets: updatedBullets,
                            };

                            setProposal({
                              ...proposal,
                              experiences: updatedExperiences,
                            });
                          }}
                          className="rounded border px-3"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const updatedExperiences = [...proposal.experiences];

                        updatedExperiences[index] = {
                          ...experience,
                          bullets: [...experience.bullets, ""],
                        };

                        setProposal({
                          ...proposal,
                          experiences: updatedExperiences,
                        });
                      }}
                      className="rounded border px-3 py-1"
                    >
                      Add Bullet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-md border p-4">
            <h4 className="mb-4 text-lg font-semibold">Skills</h4>

            <div className="space-y-3">
              {proposal.skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category"
                    value={skill.category ?? ""}
                    onChange={(event) => {
                      const updatedSkills = [...proposal.skills];

                      updatedSkills[index] = {
                        ...skill,
                        category: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        skills: updatedSkills,
                      });
                    }}
                    className="w-1/3 rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Skill"
                    value={skill.name}
                    onChange={(event) => {
                      const updatedSkills = [...proposal.skills];

                      updatedSkills[index] = {
                        ...skill,
                        name: event.target.value,
                      };

                      setProposal({
                        ...proposal,
                        skills: updatedSkills,
                      });
                    }}
                    className="w-full rounded border p-2"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setProposal({
                        ...proposal,
                        skills: proposal.skills.filter(
                          (_, skillIndex) => skillIndex !== index,
                        ),
                      });
                    }}
                    className="rounded border px-3"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setProposal({
                    ...proposal,
                    skills: [
                      ...proposal.skills,
                      {
                        category: "",
                        name: "",
                      },
                    ],
                  });
                }}
                className="rounded border px-3 py-1"
              >
                Add Skill
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Adding to Vault..." : "Confirm Import"}
          </button>
        </div>
      )}
    </div>
  );
}
