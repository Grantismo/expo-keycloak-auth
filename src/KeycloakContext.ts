import { createContext } from 'react';
import { KC_INITIAL_VALUE } from './const';
import { AuthRequestPromptOptions, TokenResponse } from 'expo-auth-session';

interface KcContext {
  ready: boolean
  isLoggedIn: boolean
  login: (options?: AuthRequestPromptOptions) => void
  logout: () => void
  token: TokenResponse | null
}

export const KeycloakContext = createContext<KcContext>(KC_INITIAL_VALUE);
