const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 15000;

async function request(url, options = {}) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error("A conexão demorou demais. Verifique sua internet e tente novamente.");
    }
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
  }
}

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
  const response = await request(`${API_URL}/health`);

  return parseResponse(response);
}

export async function bootstrapCompany(data) {
  const response = await request(`${API_URL}/bootstrap`, {
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

  const response = await request(`${API_URL}/login`, {
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

  const response = await request(`${API_URL}${path}`, {
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

  const response = await request(`${API_URL}${path}`, {
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

export async function apiPut(path, data, version) {
  const token = localStorage.getItem("nexus_api_token");

  const response = await request(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(Number.isSafeInteger(version) ? {"x-record-version":String(version)} : {}),
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