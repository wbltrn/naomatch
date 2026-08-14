const API_URL = "http://127.0.0.1:8000";

export async function checkBackend() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend unavailable");
  }

  return response.json();
}

export async function getExperiences() {
  const response = await fetch("http://127.0.0.1:8000/experiences/");

  if (!response.ok) {
    throw new Error("Failed to fetch experiences");
  }

  return response.json();
}

export async function createExperience(experience: {
  type: string;
  organization?: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string | null;
  description?: string;
  bullets: { bullet_text: string }[];
}) {
  const response = await fetch("http://127.0.0.1:8000/experiences/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(experience),
  });

  if (!response.ok) {
    throw new Error("Failed to create experience");
  }

  return response.json();
}

export async function deleteExperience(experienceId: number) {
  const response = await fetch(
    `http://127.0.0.1:8000/experiences/${experienceId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete experience");
  }

  return response.json();
}

export async function updateExperience(
  experienceId: number,
  experience: {
    type: string;
    organization?: string;
    title: string;
    location?: string;
    start_date?: string;
    end_date?: string | null;
    description?: string;
    bullets: { bullet_text: string }[];
  }
) {
  const response = await fetch(
    `http://127.0.0.1:8000/experiences/${experienceId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(experience),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update experience");
  }

  return response.json();
}

export async function getJobs() {
  const response = await fetch("http://127.0.0.1:8000/jobs/");

  if (!response.ok) {
    throw new Error("Failed to fetch jobs");
  }

  return response.json();
}

export async function getJob(jobId: number) {
  const response = await fetch(
    `${API_URL}/jobs/${jobId}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Job not found.");
    }

    throw new Error(
      "Failed to fetch job."
    );
  }

  return response.json();
}

export async function createJob(job: {
  company: string;
  title: string;
  location?: string;
  job_url?: string | null;
  description: string;
}) {
  const response = await fetch("http://127.0.0.1:8000/jobs/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    throw new Error("Failed to create job");
  }

  return response.json();
}

export async function updateJob(
  jobId: number,
  job: {
    company: string;
    title: string;
    location?: string;
    job_url?: string | null;
    description: string;
  }
) {
  const response = await fetch(
    `http://127.0.0.1:8000/jobs/${jobId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(job),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update job");
  }

  return response.json();
}

export async function deleteJob(jobId: number) {
  const response = await fetch(
    `http://127.0.0.1:8000/jobs/${jobId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete job");
  }

  return response.json();
}

export async function getApplications() {
  const response = await fetch("http://127.0.0.1:8000/applications/");

  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }

  return response.json();
}

export async function createApplication(application: {
  job_id: number;
  status: string;
  applied_date?: string | null;
  deadline?: string | null;
  notes?: string | null;
}) {
  const response = await fetch("http://127.0.0.1:8000/applications/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(application),
  });

if (!response.ok) {
  const errorData = await response.json();

  throw new Error(
    errorData.detail || "Failed to create application"
  );
}

  return response.json();
}

export async function updateApplication(
  applicationId: number,
  application: {
    status: string;
    applied_date?: string | null;
    deadline?: string | null;
    notes?: string | null;
  }
) {
  const response = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(application),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update application");
  }

  return response.json();
}

export async function deleteApplication(applicationId: number) {
  const response = await fetch(
    `http://127.0.0.1:8000/applications/${applicationId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete application");
  }

  return response.json();
}

export type ResumeImportLink = {
  label: string;
  url: string;
};

export type ResumeImportProfile = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  links: ResumeImportLink[];
};

export type ResumeImportEducation = {
  school: string;
  degree?: string | null;
  field_of_study?: string | null;
  minor?: string | null;
  location?: string | null;
  start_date?: string | null;
  graduation_date?: string | null;
  gpa?: string | null;
  coursework: string[];
  honors: string[];
};

export type ResumeImportExperience = {
  type: string;
  organization?: string | null;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  bullets: string[];
};

export type ResumeImportSkill = {
  category?: string | null;
  name: string;
};

export type ResumeImportProposal = {
  profile: ResumeImportProfile;
  education: ResumeImportEducation[];
  experiences: ResumeImportExperience[];
  skills: ResumeImportSkill[];
};

export type ResumeImportResponse = {
  filename: string;
  extracted_text: string;
  proposal: ResumeImportProposal;
  status: string;
};

export async function uploadResumeForImport(
  file: File
): Promise<ResumeImportResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/vault/import/resume`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to import resume"
    );
  }

  return response.json();
}

export async function confirmResumeImport(
  proposal: ResumeImportProposal
) {
  const response = await fetch(
    `${API_URL}/vault/import/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proposal,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to confirm resume import"
    );
  }

  return response.json();
}

export type VaultEducation = {
  id: number;
  school: string;
  degree?: string | null;
  field_of_study?: string | null;
  minor?: string | null;
  location?: string | null;
  start_date?: string | null;
  graduation_date?: string | null;
  gpa?: string | null;
  coursework?: string | null;
  honors?: string | null;
};

export type VaultBullet = {
  id: number;
  bullet_text: string;
};

export type VaultExperience = {
  id: number;
  title: string;
  organization?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  bullets: VaultBullet[];
};

export type VaultExperienceSection = {
  section_type: string;
  items: VaultExperience[];
};

export type VaultSkill = {
  id: number;
  category?: string | null;
  name: string;
};

export type VaultData = {
  education: VaultEducation[];
  experience_sections: VaultExperienceSection[];
  skills: VaultSkill[];
};

export type ProfileLink = {
  label: string;
  url: string;
};

export type ProfileData = {
  name: string;
  phone?: string | null;
  email?: string | null;
  links: ProfileLink[];
};

export async function getVault(): Promise<VaultData> {
  const response = await fetch(`${API_URL}/vault`);

  if (!response.ok) {
    throw new Error("Failed to fetch vault");
  }

  return response.json();
}

export async function getProfile(): Promise<ProfileData> {
  const response = await fetch(`${API_URL}/profile`);

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}

export async function updateProfile(
  profile: ProfileData
): Promise<ProfileData> {
  const response = await fetch(`${API_URL}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to update profile"
    );
  }

  return response.json();
}


export type EducationPayload = {
  school: string;
  degree?: string | null;
  field_of_study?: string | null;
  minor?: string | null;
  location?: string | null;
  start_date?: string | null;
  graduation_date?: string | null;
  gpa?: string | null;
  coursework?: string | null;
  honors?: string | null;
};


export async function createEducation(
  education: EducationPayload
) {
  const response = await fetch(`${API_URL}/education`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(education),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to create education"
    );
  }

  return response.json();
}


export async function updateEducation(
  educationId: number,
  education: EducationPayload
) {
  const response = await fetch(
    `${API_URL}/education/${educationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(education),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to update education"
    );
  }

  return response.json();
}


export async function deleteEducation(
  educationId: number
) {
  const response = await fetch(
    `${API_URL}/education/${educationId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to delete education"
    );
  }

  return response.json();
}


export type ExperiencePayload = {
  type: string;
  organization?: string | null;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  bullets: {
    bullet_text: string;
  }[];
};


export async function createVaultExperience(
  experience: ExperiencePayload
) {
  const response = await fetch(`${API_URL}/experiences/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(experience),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to create experience"
    );
  }

  return response.json();
}


export async function updateVaultExperience(
  experienceId: number,
  experience: ExperiencePayload
) {
  const response = await fetch(
    `${API_URL}/experiences/${experienceId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(experience),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to update experience"
    );
  }

  return response.json();
}


export async function deleteVaultExperience(
  experienceId: number
) {
  const response = await fetch(
    `${API_URL}/experiences/${experienceId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to delete experience"
    );
  }

  return response.json();
}


export type SkillPayload = {
  category?: string | null;
  name: string;
};


export async function createSkill(
  skill: SkillPayload
) {
  const response = await fetch(`${API_URL}/skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(skill),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to create skill"
    );
  }

  return response.json();
}


export async function updateSkill(
  skillId: number,
  skill: SkillPayload
) {
  const response = await fetch(
    `${API_URL}/skills/${skillId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(skill),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to update skill"
    );
  }

  return response.json();
}


export async function deleteSkill(
  skillId: number
) {
  const response = await fetch(
    `${API_URL}/skills/${skillId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || "Failed to delete skill"
    );
  }

  return response.json();
}

export async function tailorResume(
  jobId: number
) {
  const response = await fetch(
    `${API_URL}/resume-tailor/job/${jobId}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.detail
        || "Failed to tailor resume"
    );
  }

  return response.json();
}