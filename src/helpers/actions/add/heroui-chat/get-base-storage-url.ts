/**
 * Get the base storage url from the given url
 */
export async function getBaseStorageUrl(url: string) {
  const httpMatch = url.match(/^https?:\/\//)?.[0] ?? '';
  const [baseUrl, userId, sandboxId, chatTitle] = url.replace(httpMatch, '').split('/');

  const baseStorageUrl = `${httpMatch}${baseUrl}/sandbox/files/${sandboxId}`;

  return {
    baseStorageUrl,
    chatTitle,
    sandboxId,
    userId: userId ?? ''
  };
}
