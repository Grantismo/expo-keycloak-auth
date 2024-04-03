import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, AppStateStatus } from "react-native"
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { REFRESH_TIME_BUFFER, TOKEN_STORAGE_KEY } from './const';
import { getCurrentTimeInSeconds, Config } from "./helpers"
import * as AuthSession from "expo-auth-session";
import { TokenResponse, DiscoveryDocument } from "expo-auth-session";

type Timeout = ReturnType<typeof setTimeout>

export type Props = {
  tokenStorageKey?: string
  refreshTimeBuffer?: number,
  disableAutoRefresh?: boolean,
}

export const useTokenStorage = ({
  tokenStorageKey = TOKEN_STORAGE_KEY,
  refreshTimeBuffer = REFRESH_TIME_BUFFER,
  disableAutoRefresh = false
}: Props, config: Config, discovery: DiscoveryDocument|null) => {

  const [token, setToken] = useState<TokenResponse|null>(null)
  const { getItem, setItem, removeItem } = useAsyncStorage(tokenStorageKey);
  const refreshHandler = useRef<Timeout|null>(null)
  const appState = useRef(AppState.currentState);
  const refreshTime = useRef<number|null>(null)
  const tokenData = useRef<TokenResponse|null>(null)

  async function updateAndSaveToken(newToken: TokenResponse|null) {
    try {
      setToken(newToken)
      if (newToken !== null) {
        const stringifiedValue = JSON.stringify(newToken);
        await setItem(stringifiedValue)
      } else {
        await removeItem()
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleTokenRefresh = (token: TokenResponse) => {
    AuthSession.refreshAsync(
      { refreshToken: token.refreshToken, ...config },
      discovery!
    )
      .then((tokenResponse) => {
        updateAndSaveToken(tokenResponse)
      })
      .catch(err => {
        updateAndSaveToken(null)
      })
  }

  useEffect(() => {
    const handleAppState = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        if (refreshHandler.current !== null) {
          clearTimeout(refreshHandler.current)
          const now = getCurrentTimeInSeconds()

          if (!refreshTime.current || refreshTime.current <= now) {
            setToken(null)
          } else {
            const timeout = 1000 * (refreshTime.current - now)
            refreshHandler.current = setTimeout(() => {
              handleTokenRefresh(tokenData.current!)
            }, timeout)
          }
        }
      }
      appState.current = nextAppState;
    }
    const subscription = AppState.addEventListener("change", handleAppState);

    return () => {
      if (subscription) {
        subscription.remove()
      }
    };
  }, []);

  useEffect(() => {
    async function getTokenFromStorage() {
      try {
        const tokenFromStorage = await getItem()
        if (!tokenFromStorage) {
          throw new Error("No token in storage")
        }
        const token = JSON.parse(tokenFromStorage)
        if (!TokenResponse.isTokenFresh(token, -refreshTimeBuffer)) {
          handleTokenRefresh(token)
        } else {
          setToken(token)
        }
      } catch (error) {
        setToken(null)
      }
    }
    if (!!discovery) getTokenFromStorage()
  }, [discovery]);

  useEffect(() => {
    // trigger every token update
    tokenData.current = token
    if (token !== undefined && !disableAutoRefresh) {

      if (refreshHandler.current !== null) {
        clearTimeout(refreshHandler.current)
      }
      if (token !== null && token.expiresIn) {
        const now = getCurrentTimeInSeconds()
        refreshTime.current = token.issuedAt + token.expiresIn - refreshTimeBuffer

        const timeout = 1000 * (refreshTime.current - now)
        refreshHandler.current = setTimeout(() => {
          handleTokenRefresh(token)
        }, timeout)
      }
      if (token === null && tokenData.current !== null) {
        AuthSession.revokeAsync(
          { token: tokenData.current?.accessToken, ...config }, discovery!
        )
        Platform.OS === 'ios' && AuthSession.dismiss();
        refreshTime.current = null
        tokenData.current = null
      }
    }
  }, [token])


  return [token, updateAndSaveToken] as const;
};
