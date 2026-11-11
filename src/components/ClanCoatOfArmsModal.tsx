import React, { useState } from 'react';
import { Shield, Sparkles, Upload, X, Trash2, Check, RefreshCw } from 'lucide-react';
import { ClanInfo } from '../utils/lineageUtils';
import { uploadFileToServer } from '../utils/fileStorage';
import { authHeaders } from '../utils/auth';
import { generateHeraldicSvg } from '../utils/heraldicGenerator';

interface ClanCoatOfArmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clan: ClanInfo;
  isAdmin: boolean;
  onSaveCoatOfArms: (clanName: string, coatOfArmsData: { url: string; motto?: string; description?: string } | null) => void;
}

export const ClanCoatOfArmsModal: React.FC<ClanCoatOfArmsModalProps> = ({
  isOpen,
  onClose,
  clan,
  isAdmin,
  onSaveCoatOfArms,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'upload'>('generate');
  const [motto, setMotto] = useState(clan.coatOfArmsMotto || `РІД ${clan.name.toUpperCase()}`);
  const [symbol, setSymbol] = useState<'lion' | 'falcon' | 'cross' | 'wheat'>('lion');
  const [shieldColor, setShieldColor] = useState<'azure' | 'gules' | 'vert' | 'sable' | 'purpure'>('azure');
  const [styleMode, setStyleMode] = useState<'classic' | 'gemini_image'>('classic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(clan.coatOfArmsUrl || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const url = await uploadFileToServer(file);
      setPreviewUrl(url);
      onSaveCoatOfArms(clan.name, {
        url,
        motto: motto.trim() || undefined,
        description: `Завантажений герб роду ${clan.name}`,
      });
    } catch (err: any) {
      setErrorMsg('Помилка завантаження файлу зображення');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg(null);

      let heraldicUrl: string | null = null;
      let description = `Геральдичний герб роду ${clan.name}`;

      try {
        const res = await fetch('/api/coat-of-arms/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            clanName: clan.name,
            motto: motto.trim(),
            symbol,
            shieldColor,
            style: styleMode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            heraldicUrl = data.url;
            if (data.description) description = data.description;
          }
        }
      } catch (e) {
        console.warn('Server coat of arms generation request failed, using client-side vector engine:', e);
      }

      // If server route didn't return URL (e.g. unauthenticated or AI offline), generate authentic heraldic SVG in client
      if (!heraldicUrl) {
        const svgString = generateHeraldicSvg({
          clanName: clan.name,
          motto: motto.trim(),
          style: styleMode === 'gemini_image' ? 'classic' : styleMode,
          symbol,
          shieldColor,
        });
        heraldicUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      }

      setPreviewUrl(heraldicUrl);
      onSaveCoatOfArms(clan.name, {
        url: heraldicUrl,
        motto: motto.trim() || undefined,
        description,
      });
    } catch (err: any) {
      setErrorMsg('Помилка створення герба');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onSaveCoatOfArms(clan.name, null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ backgroundColor: clan.bgColor, borderColor: clan.borderColor }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: clan.badgeBg, color: clan.color }}
            >
              <Shield size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 font-serif-heritage">
                  Герб роду «{clan.name}»
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: clan.badgeBg, color: clan.badgeText }}
                >
                  {clan.count} осіб
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Офіційний родинний герб та девіз для карток та бічної панелі
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200/60 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Coat of Arms Preview */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-stone-50/80 border border-stone-200/90 text-center relative">
            {previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt={`Герб роду ${clan.name}`}
                  className="w-40 h-48 object-contain drop-shadow-md rounded-lg transition-transform group-hover:scale-105"
                />
                {isAdmin && (
                  <button
                    onClick={handleRemove}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer opacity-90 hover:opacity-100"
                    title="Видалити герб"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-stone-400">
                <Shield size={54} strokeWidth={1.2} className="mb-2 text-stone-300" />
                <p className="text-xs font-semibold text-stone-600">Герб для цього роду ще не встановлено</p>
                <p className="text-[11px] text-stone-400 max-w-xs mt-1">
                  Ви можете згенерувати історичний український герб або завантажити наявне зображення
                </p>
              </div>
            )}

            {motto && previewUrl && (
              <div className="mt-3 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-950 text-xs font-serif italic tracking-wide">
                «{motto}»
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {isAdmin ? (
            <>
              {/* Tabs: Generate vs Upload */}
              <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('generate')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'generate'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Sparkles size={13} className="text-amber-600" />
                  <span>Згенерувати геральдику</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Upload size={13} className="text-stone-600" />
                  <span>Завантажити файл</span>
                </button>
              </div>

              {activeTab === 'generate' ? (
                <div className="space-y-4">
                  {/* Motto Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Родинне гасло / Девіз
                    </label>
                    <input
                      type="text"
                      value={motto}
                      onChange={(e) => setMotto(e.target.value)}
                      placeholder={`Рід ${clan.name}`}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 bg-stone-50/50"
                    />
                  </div>

                  {/* Heraldic Symbol Charge Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Центральний геральдичний символ
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'lion', label: 'Галицький Лев', icon: '🦁' },
                        { id: 'falcon', label: 'Сокіл (Тризуб)', icon: '🦅' },
                        { id: 'cross', label: 'Козацький Хрест', icon: '⚔️' },
                        { id: 'wheat', label: 'Колосся та Дуб', icon: '🌾' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSymbol(item.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            symbol === item.id
                              ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-lg block mb-0.5">{item.icon}</span>
                          <span className="text-[11px] font-bold block leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shield Field Color */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Колір геральдичного щита
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { id: 'azure', label: 'Лазур (синій)', hex: '#1e3a8a' },
                        { id: 'gules', label: 'Червлень (червоний)', hex: '#991b1b' },
                        { id: 'vert', label: 'Смарагд (зелений)', hex: '#065f46' },
                        { id: 'sable', label: 'Шляхетський чорний', hex: '#27272a' },
                        { id: 'purpure', label: 'Пурпур (королівський)', hex: '#581c87' },
                      ].map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setShieldColor(col.id as any)}
                          className={`h-7 px-2.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            shieldColor === col.id
                              ? 'ring-2 ring-stone-900 border-white text-white shadow-xs'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                          style={{
                            backgroundColor: shieldColor === col.id ? col.hex : undefined,
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span>{col.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Mode: Vector Heraldry vs Gemini AI Image */}
                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-[11px] font-bold text-stone-700">Стиль генерації:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStyleMode('classic')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                          styleMode === 'classic'
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        Класичний вектор (SVG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStyleMode('gemini_image')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                          styleMode === 'gemini_image'
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        Ілюстрація Gemini AI
                      </button>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Створення герба...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Згенерувати герб роду</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Upload Custom File */
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-6 text-center transition-colors">
                    <Upload size={32} className="mx-auto text-stone-400 mb-2" />
                    <p className="text-xs font-bold text-stone-800">
                      Оберіть зображення герба зі свого комп'ютера
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Підтримуються формати PNG, JPG, SVG, WebP
                    </p>
                    <label className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all">
                      <span>Обрати файл</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-stone-500 text-center italic">
              Редагування та завантаження гербів доступне в режимі Адміністратора.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
