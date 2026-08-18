'use client';

import {createContext, useContext, type ReactNode} from 'react';

type AuthSessionValue = {
  email: string | null;
  /** Where “home” should go in the signed-in product vs marketing. */
  homeHref: string;
};

const AuthSessionContext = createContext<AuthSessionValue>({
  email: null,
  homeHref: '/',
});

export function AuthSessionProvider({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  const homeHref = email ? '/studio' : '/';
  return (
    <AuthSessionContext.Provider value={{email, homeHref}}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionValue {
  return useContext(AuthSessionContext);
}

/** Brand / home destination that respects signed-in vs marketing. */
export function useHomeHref(): string {
  return useAuthSession().homeHref;
}
