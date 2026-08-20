import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  isLoggedIn: boolean;
  userEmail: string | null;
  tier: 'guest' | 'registered';
  rateLimitRemaining: number;
  login: (email: string) => void;
  signup: (email: string) => void;
  logout: () => void;
  decrementRateLimit: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('archer_auth') === 'true';
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('archer_email') || null;
  });
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number>(() => {
    const saved = localStorage.getItem('archer_rate_limit');
    return saved ? parseInt(saved, 10) : 40;
  });

  const tier = isLoggedIn ? 'registered' : 'guest';

  useEffect(() => {
    localStorage.setItem('archer_auth', isLoggedIn.toString());
    if (userEmail) {
      localStorage.setItem('archer_email', userEmail);
    } else {
      localStorage.removeItem('archer_email');
    }
  }, [isLoggedIn, userEmail]);

  useEffect(() => {
    localStorage.setItem('archer_rate_limit', rateLimitRemaining.toString());
  }, [rateLimitRemaining]);

  const login = (email: string) => {
    setIsLoggedIn(true);
    setUserEmail(email);
    setRateLimitRemaining(500);
  };

  const signup = (email: string) => {
    setIsLoggedIn(true);
    setUserEmail(email);
    setRateLimitRemaining(500);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserEmail(null);
    setRateLimitRemaining(40);
  };

  const decrementRateLimit = () => {
    setRateLimitRemaining((prev) => Math.max(0, prev - 1));
  };

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        userEmail,
        tier,
        rateLimitRemaining,
        login,
        signup,
        logout,
        decrementRateLimit,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
