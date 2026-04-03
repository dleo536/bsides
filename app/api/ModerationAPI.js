import { apiFetch } from "./apiClient";

const parseJsonSafely = async (response, label) => {
  const raw = await response.text();
  if (!raw || !raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`${label} returned non-JSON payload`, response.status);
    return null;
  }
};

const throwApiError = (message, status, payload) => {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  throw error;
};

export const submitContentReport = async ({
  targetType,
  targetId,
  reason,
  details,
} = {}) => {
  const response = await apiFetch(
    "/reports",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        details,
      }),
    },
    { authRequired: true }
  );
  const data = await parseJsonSafely(response, "POST /reports");

  if (!response.ok) {
    throwApiError(data?.message || "Could not submit report", response.status, data);
  }

  return data;
};

export const getUserBlockState = async (targetUserId) => {
  const response = await apiFetch(
    `/users/${encodeURIComponent(targetUserId)}/block-state`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    { authRequired: true }
  );
  const data = await parseJsonSafely(response, "GET /users/:id/block-state");

  if (!response.ok) {
    throwApiError(data?.message || "Could not load block state", response.status, data);
  }

  return data;
};

export const blockUserAccount = async (targetUserId) => {
  const response = await apiFetch(
    `/users/${encodeURIComponent(targetUserId)}/block`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    { authRequired: true }
  );
  const data = await parseJsonSafely(response, "POST /users/:id/block");

  if (!response.ok) {
    throwApiError(data?.message || "Could not block this user", response.status, data);
  }

  return data;
};

export const unblockUserAccount = async (targetUserId) => {
  const response = await apiFetch(
    `/users/${encodeURIComponent(targetUserId)}/block`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    { authRequired: true }
  );
  const data = await parseJsonSafely(response, "DELETE /users/:id/block");

  if (!response.ok) {
    throwApiError(data?.message || "Could not unblock this user", response.status, data);
  }

  return data;
};
