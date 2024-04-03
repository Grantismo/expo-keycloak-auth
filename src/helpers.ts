import { DiscoveryDocument, AuthSessionResult, exchangeCodeAsync } from 'expo-auth-session';

export interface Config {
  realm: string;
  url: string;
  redirectUri: string;
  clientId: string;
}

export const getRealmURL = (config: {url: string, realm: string}) => {
  const { url, realm } = config;
  const slash = url.endsWith('/') ? '' : '/';
  return `${url + slash}realms/${encodeURIComponent(realm)}`;
};

export function getCurrentTimeInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export const handleTokenExchange = async ({
  response,
  discovery,
  config,
}: {response: AuthSessionResult | null, discovery: DiscoveryDocument|null, config: Config}) => {
  try {
    if (response?.type === 'success' && !!(discovery?.tokenEndpoint)) {
      const token = await exchangeCodeAsync(
        { code: response.params.code, ...config },
        discovery,
      );
      return token;
    }
    if (response?.type === 'error') {
      return null;
    }
    return null;
  } catch (error) {
    return null;
  }
};
