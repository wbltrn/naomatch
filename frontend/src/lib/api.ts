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