import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bone,
  Cat,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Dog,
  Eye,
  EyeOff,
  Fish,
  Heart,
} from "lucide-react";
import patternBg from "../assets/images/pattern-watermark.svg";
import { passwordRequirements, strengthOf } from "../lib/passwordStrength";
import { apiFetch, ApiError } from "../lib/api";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = strengthOf(password);

  function handleBack() {
    navigate("/login");
  }

  async function handleSubmit() {
    setError("");

    if (!password || !confirmPassword) {
      setError("請完整填寫所有欄位");
      return;
    }
    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      navigate("/login");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "無法連上伺服器，請確認後端是否已啟動",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f7f1e8]"
      style={{
        backgroundImage: `url(${patternBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col px-5 py-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回登入頁面"
          className="grid h-9 w-9 place-items-center rounded-full text-ink/60 transition hover:bg-white/60"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="mt-2 flex items-center justify-center gap-3 text-center">
          <Heart size={18} className="fill-[#e8b9a8] text-[#e8b9a8]" />
          <h2 className="text-xl font-bold text-ink">重設新密碼</h2>
          <Heart size={18} className="fill-[#a9c2da] text-[#a9c2da]" />
        </div>
        <p className="mt-1 text-center text-sm text-ink/60">請輸入新的密碼</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              新密碼
            </label>
            <div className="flex items-center rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-4 py-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入至少 8 個字元"
                autoComplete="new-password"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="顯示或隱藏密碼"
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/80">
              確認新密碼
            </label>
            <div className="flex items-center rounded-2xl border border-[#ece0d2] bg-[#fffdfa]/90 px-4 py-3">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
                autoComplete="new-password"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="顯示或隱藏密碼"
                className="text-ink/35 transition hover:text-ink/60"
              >
                {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm text-ink/70">
              密碼強度：
              {password && (
                <span className="font-semibold" style={{ color: strength.color }}>
                  {" "}
                  {strength.label}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#ece4dc]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${strength.ratio * 100}%`,
                  backgroundColor: strength.color,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#ece0d2] bg-[#fbf8f4] p-4">
            <div className="mb-2 text-sm text-ink/70">密碼需符合以下條件：</div>
            <div className="space-y-2">
              {passwordRequirements.map((r) => {
                const passed = r.test(password);
                return (
                  <div key={r.key} className="flex items-center gap-2">
                    {passed ? (
                      <CheckCircle2 size={15} className="shrink-0 text-[#3fa876]" />
                    ) : (
                      <Circle size={15} className="shrink-0 text-ink/25" />
                    )}
                    <span
                      className={`text-[12px] ${
                        passed ? "text-ink/80" : "text-ink/50"
                      }`}
                    >
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-center text-xs text-red-500">{error}</p>
        )}

        <div className="relative mt-8 flex flex-1 items-end justify-between px-2 pb-4">
          <Cat size={56} className="text-[#c9a06f]/80" />
          <Fish size={22} className="text-[#a9c2da]" />
          <Bone size={20} className="absolute left-1/2 top-4 -translate-x-1/2 text-[#c9a06f]/50" />
          <Dog size={64} className="text-[#c9a06f]" />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-[#caa06f] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(201,159,109,.35)] transition hover:bg-[#bd9260] disabled:opacity-60"
        >
          {loading ? "更新中…" : "更新密碼"}
        </button>
      </div>
    </div>
  );
}
