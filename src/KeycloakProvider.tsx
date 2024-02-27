import React, { useCallback, useEffect, HTMLAttributes, createContext } from 'react';
import { Platform } from 'react-native'
import * as AuthSession from 'expo-auth-session';
import {
  useAuthRequest,
  useAutoDiscovery,
  AuthRequestPromptOptions,
} from 'expo-auth-session';
import { useTokenStorage, Props as TokenProps}  from './useTokenStorage';
import { handleTokenExchange, getRealmURL } from './helpers';
import {
  NATIVE_REDIRECT_PATH,
} from './const';
import { KeycloakContext } from './KeycloakContext'

const DISCOVERY_TIMEOUT_SECONDS = 10

interface Props extends HTMLAttributes<HTMLElement> {
  clientId: string,
  realm: string,
  url: string,
  scheme?: string,
  children: any,
  extraParams?: any,
  nativeRedirectPath?: string
  tokenOptions?: TokenProps,
  onDiscoveryError: (error: Error) => void
}

export const KeycloakProvider = ({
  realm,
  clientId,
  url,
  extraParams,
  children,
  scheme,
  nativeRedirectPath,
  tokenOptions,
  onDiscoveryError }: Props) => {

  const discovery = useAutoDiscovery(getRealmURL({ realm, url }));
  const redirectUri = AuthSession.makeRedirectUri({
    native: `${scheme ?? 'exp'}://${nativeRedirectPath ?? NATIVE_REDIRECT_PATH}`,
  });

  const config = { redirectUri, clientId, realm, url, ...extraParams }

  const [request, response, promptAsync] = useAuthRequest(
    { usePKCE: true, ...config },
    discovery,
  );

  const [currentToken, updateToken] = useTokenStorage(tokenOptions ?? {}, config, discovery)

  const handleLogin = useCallback((options?: AuthRequestPromptOptions) => {
    return promptAsync(options);
  }, [request])

  const handleLogout = () => {
    if (!currentToken) throw new Error('Not logged in.');
    try {
      if (discovery?.revocationEndpoint) {
        AuthSession.revokeAsync(
          { token: currentToken?.accessToken, ...config }, discovery
        )
      }
      if(discovery?.endSessionEndpoint) {
        fetch(`${discovery.endSessionEndpoint}`, {
          method: 'POST',         
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `client_id=${clientId}&refresh_token=${currentToken.refreshToken}`
        })
      }
      if(Platform.OS === 'ios') {
        AuthSession.dismiss();
      }
    } catch (error) {
      console.log(error)
    }
    updateToken(null)
  }

  useEffect(() => {
    const discoveryWait = setTimeout(() => {
      if(!discovery) {
        onDiscoveryError(new Error("timeout waiting for auth url"))
      }
    }, DISCOVERY_TIMEOUT_SECONDS*1000) 
    return () => clearTimeout(discoveryWait)
  }, [])

  useEffect(() => {
    if (response) {
      handleTokenExchange({ response, discovery, config })
        .then(updateToken)
    }
  }, [response])

  return (
    <KeycloakContext.Provider
      value={{
        isLoggedIn: !!currentToken,
        login: handleLogin,
        logout: handleLogout,
        ready: discovery !== null && request !== null && currentToken !== undefined,
        token: currentToken,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};
