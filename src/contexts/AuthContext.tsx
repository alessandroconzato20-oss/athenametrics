import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  name: string;
  email: string;
  year: number;
  semester: number;
  streak: number;
  studySessions: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, password: string, year: number, semester: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cofactor-user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, _password: string) => {
    const u: User = { name: email.split("@")[0], email, year: 3, semester: 1, streak: 7, studySessions: 23 };
    localStorage.setItem("cofactor-user", JSON.stringify(u));
    setUser(u);
  };

  const signup = (name: string, email: string, _password: string, year: number, semester: number) => {
    const u: User = { name, email, year, semester, streak: 0, studySessions: 0 };
    localStorage.setItem("cofactor-user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("cofactor-user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
