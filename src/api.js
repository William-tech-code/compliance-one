const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      `A API retornou uma resposta inválida (${response.status}). ` +
      `Verifique se o backend está rodando em ${API_URL}. ` +
      `Resposta: ${text.slice(0, 120)}`
    );
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro na API.");
  }

  return result;
}

export async function apiHealth() {
  const response = await fetch(`${API_URL}/health`);

  return parseResponse(response);
}

export async function bootstrapCompany(data) {
  const response = await fetch(`${API_URL}/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await parseResponse(response);

  if (result.token) {
    localStorage.setItem("nexus_api_token", result.token);
  }

  return result;
}

export async function login(dataOrEmail, password) {
  const data =
    typeof dataOrEmail === "object"
      ? dataOrEmail
      : {
          email: dataOrEmail,
          password,
        };

  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: String(data.email || "").trim().toLowerCase(),
      password: String(data.password || ""),
    }),
  });

  const result = await parseResponse(response);

  if (result.token) {
    localStorage.setItem("nexus_api_token", result.token);
  }

  return result;
}

export async function apiGet(path) {
  const token = localStorage.getItem("nexus_api_token");

  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  return parseResponse(response);
}

export async function apiPost(path, data) {
  const token = localStorage.getItem("nexus_api_token");

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

export async function apiPut(path, data) {
  const token = localStorage.getItem("nexus_api_token");

  const response = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

export function logout() {
  localStorage.removeItem("nexus_api_token");
}