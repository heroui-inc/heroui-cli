import {fetchRequest} from '@helpers/fetch';

/**
 * Get the base storage url from the given url
 */
export async function getBaseStorageUrl(url: string) {
  const removedHttp = url.replace(/^https:\/\//, '');
  const [baseUrl, baseUrlKey, codeSandboxId, chatTitle] = removedHttp.split('/');

  const dubUrl = `https://${baseUrl}/${baseUrlKey}`;
  let baseStorageUrl = '';
  let token = '';

  const response = await fetchRequest(dubUrl, {fetchInfo: 'base storage url', throwError: false});

  if (response.redirected) {
    baseStorageUrl = response.url.replace(/\/$/, '');
    const httpMatch = baseStorageUrl.match(/^https?:\/\//)?.[0] ?? '';
    const [baseUrl, tokenUrl, ...rest] = baseStorageUrl.replace(httpMatch, '').split('/');

    baseStorageUrl = `${httpMatch}${baseUrl}${rest.length ? `/${rest.join('/')}` : ''}`;
    token = decodeURI(tokenUrl ?? '').split(' ')[1] ?? '';
  }

  return {
    baseStorageUrl,
    chatTitle,
    codeSandboxId,
    token
  };
}
