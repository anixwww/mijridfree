import React, { useState, useEffect } from 'react';
import { ConnectionMeta } from '../types/tree';
import { X, CheckCircle2, AlertCircle, Link2, Check } from 'lucide-react';

interface EditConnectionModalProps {
  connectionId: string;
  initialMeta?: ConnectionMeta;
  isCurrentlyVerified?: boolean;
  connectionLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connectionId: string, meta: ConnectionMeta) => void;
}

export const EditConnectionModal: React.FC<EditConnectionModalProps> = ({
  connectionId,
  initialMeta,
  isCurrentlyVerified = true,
  connectionLabel,
  isOpen,
  onClose,
  onSave,
}) => {
  // Determine initial state: prioritize explicit initialMeta.verified, otherwise fallback to isCurrentlyVerified
  const [isVerified, setIsVerified] = useState<boolean>(
    initialMeta?.verified !== undefined
      ? initialMeta.verified
      : initialMeta?.confidenceLevel === 'hypothetical'
      ? false
      : isCurrentlyVerified
  );

  useEffect(() => {
    if (isOpen) {
      setIsVerified(
        initialMeta?.verified !== undefined
          ? initialMeta.verified
          : initialMeta?.confidenceLevel === 'hypothetical'
          ? false
          : isCurrentlyVerified
      );
    }
  }, [isOpen, initialMeta, isCurrentlyVerified]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedMeta: ConnectionMeta = {
      verified: isVerified,
      confidenceLevel: isVerified ? 'verified' : 'hypothetical',
      hasNoEvent: true,
      eventType: undefined,
      eventDate: undefined,
      label: undefined,
      eventX: undefined,
      eventY: undefined,
    };

    onSave(connectionId, updatedMeta);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f8faf8] border-b border-[#e2e8e2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <Link2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">Статус зв'язку</h3>
              {connectionLabel && (
                <p className="text-[11px] text-stone-500 truncate max-w-[220px]">
                  {connectionLabel}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-3.5">
          <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Оберіть статус перевірки
          </div>

          {/* Option 1: Verified */}
          <button
            type="button"
            onClick={() => setIsVerified(true)}
            className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              isVerified
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/30 font-semibold shadow-xs'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isVerified ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'
              }`}
            >
              <CheckCircle2 size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Перевірено</span>
                {isVerified && <Check size={16} className="text-emerald-700" strokeWidth={2.5} />}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Суцільна лінія на схемі. Родинний зв'язок підтверджено документально.
              </p>
            </div>
          </button>

          {/* Option 2: Unverified */}
          <button
            type="button"
            onClick={() => setIsVerified(false)}
            className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              !isVerified
                ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/30 font-semibold shadow-xs'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                !isVerified ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-400'
              }`}
            >
              <AlertCircle size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Не перевірено</span>
                {!isVerified && <Check size={16} className="text-amber-700" strokeWidth={2.5} />}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Пунктирна лінія на схемі. Потребує підтвердження або додаткового дослідження.
              </p>
            </div>
          </button>

          {/* Actions Footer */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Зберегти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
