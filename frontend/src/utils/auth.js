// Decodes a JWT payload without needing any extra library.
// Returns null if the token is missing or malformed.
export function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (err) {
    return null;
  }
}

export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  const nowInSeconds = Date.now() / 1000;
  return decoded.exp < nowInSeconds;
}