import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Shield, KeyRound, Eye } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onLoginAsAdmin?: (password: string) => boolean | Promise<boolean>;
  onSwitchToGuest?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  onLoginAsAdmin,
  onSwitchToGuest,
}) => {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setPasswordError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Будь ласка, введіть пароль');
      return;
    }

    setIsSubmitting(true);
    setPasswordError(null);

    try {
      if (onLoginAsAdmin) {
        const success = await onLoginAsAdmin(password.trim());
        if (success) {
          onClose();
        } else {
          setPasswordError('Невірний пароль адміністратора');
        }
      } else {
        setPasswordError('Авторизація недоступна');
      }
    } catch {
      setPasswordError('Помилка входу. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200/90 w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
              {isAdmin ? <ShieldCheck size={18} /> : <KeyRound size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">
                {isAdmin ? 'Режим: Адміністратор' : 'Авторизація'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {isAdmin ? 'Повні права редагування родоводу' : 'Вхід адміністратора або перегляд як гість'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isAdmin ? (
            /* Admin Logged-in State */
            <div className="space-y-4">
              <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200 text-stone-800 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <ShieldCheck size={16} className="text-stone-700 shrink-0" />
                  <span>Ви увійшли як Адміністратор</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Вам доступне повне керування деревом: додавання осіб, редагування зв'язків та імпорт/експорт.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSwitchToGuest) onSwitchToGuest();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-800 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Eye size={15} className="text-stone-600" />
                <span>Перейти в режим Гостя (лише перегляд)</span>
              </button>
            </div>
          ) : (
            /* Guest / Login State */
            <div className="space-y-4">
              <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-900 mb-1">
                    Пароль адміністратора
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Введіть пароль"
                    autoFocus
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-900 font-medium"
                  />
                  {passwordError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      {passwordError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <ShieldCheck size={16} />
                  <span>{isSubmitting ? 'Перевірка...' : 'Увійти як Адмін'}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Shield size={14} className="text-stone-500" />
                <span>Продовжити як Гість</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
