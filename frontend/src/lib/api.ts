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