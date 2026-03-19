import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { apiLogin, type LoginResponse } from "@/lib/api";

interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  role: "admin" | "user" | "";
  token: string;
}

interface AuthContextValue extends AuthState {
  login: (id: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    userName: "",
    role: "",
    token: "",
  });

  const login = useCallback(async (id: string, password: string) => {
    const res: LoginResponse = await apiLogin(id, password);
    if (!res.success) throw new Error("로그인에 실패했습니다.");
    setState({
      isLoggedIn: true,
      userName: res.user_name,
      role: res.role,
      token: res.token || "",
    });
  }, []);

  const logout = useCallback(() => {
    setState({ isLoggedIn: false, userName: "", role: "", token: "" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
