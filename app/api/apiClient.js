import API_BASE_URL from "../config/api";
import { auth } from "../config/firebase";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const getRequestUrl = (path) =>
  isAbsoluteUrl(path) ? path : `${API_BASE_URL}${path}`;

const getBearerToken = async (forceRefresh = false) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to perform this action");
  }

  return currentUser.getIdToken(forceRefresh);
};

export const apiFetch = async (
  path,
  options = {},
  { authRequired = false, retryOnUnauthorized = true } = {}
) => {
  const requestUrl = getRequestUrl(path);
  const { headers: initialHeaders, ...restOptions } = options;

  const executeRequest = async (forceRefresh = false) => {
    const headers = { ...(initialHeaders || {}) };

    if (authRequired) {
      const token = await getBearerToken(forceRefresh);
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(requestUrl, {
      ...restOptions,
      headers,
    });
  };

  let response = await executeRequest(false);

  if (authRequired && retryOnUnauthorized && response.status === 401) {
    response = await executeRequest(true);
  }

  return response;
};
