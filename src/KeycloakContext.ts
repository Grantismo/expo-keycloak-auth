import { createContext } from 'react';
import { KC_INITIAL_VALUE } from './const';
import { AuthRequestPromptOptions } from 'expo-auth-session';

interface KcContext {
  ready: boolean
  isLoggedIn: boolean
  login: (options?: AuthRequestPromptOptions) => void
  logout: () => void
  token?: string
}

export const KeycloakContext = createContext<KcContext>(KC_INITIAL_VALUE);
