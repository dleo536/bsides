const normalizeProfileText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const getSanitizedDisplayName = (user) => {
  const username = normalizeProfileText(user?.username);
  const rawDisplayName = normalizeProfileText(user?.displayName || user?.name);

  if (!rawDisplayName) {
    return "";
  }

  if (!username) {
    return rawDisplayName;
  }

  const normalizedDisplayName = rawDisplayName.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  if (
    normalizedDisplayName === normalizedUsername ||
    normalizedDisplayName === `${normalizedUsername} user`
  ) {
    return "";
  }

  return rawDisplayName;
};

export const getProfileIdentity = (user) => {
  const username = normalizeProfileText(user?.username);
  const handle = username ? `@${username}` : "";
  const displayName = getSanitizedDisplayName(user);

  return {
    username,
    handle,
    displayName,
    title: displayName || handle || "User",
    subtitle: displayName && handle ? handle : "",
  };
};
