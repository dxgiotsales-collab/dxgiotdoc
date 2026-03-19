import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Login = () => {
  const { login } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(id, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다. 서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-card shadow-sm p-8 space-y-5"
      >
        <h1 className="text-xl font-bold text-foreground tracking-tight text-center">
          DXG IoT 문서 자동화
        </h1>
        <p className="text-sm text-muted-foreground text-center">로그인</p>

        <div className="space-y-1">
          <label className="dxg-label">아이디</label>
          <input
            className="dxg-input"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="dxg-label">비밀번호</label>
          <input
            className="dxg-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !id || !password}>
          {loading ? "로그인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
};

export default Login;
