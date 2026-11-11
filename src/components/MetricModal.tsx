import React, { useState, useEffect } from 'react';
import { Person, MetricDocument } from '../types/tree';
import { uploadFileToServer } from '../utils/fileStorage';
import { X, Upload, Trash2, Camera, Eye, Calendar, FileText, CheckCircle, ExternalLink } from 'lucide-react';

interface MetricModalProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPerson: Person) => void;
  initialTab?: 'birth' | 'death';
}

export const MetricModal: React.FC<MetricModalProps> = ({
  person,
  isOpen,
  onClose,
  onSave,
  initialTab = 'birth',
}) => {
  if (!isOpen || !person) return null;

  const [activeTab, setActiveTab] = useState<'birth' | 'death'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, person?.id]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Current metric URLs
  const birthUrl = person.birthMetricUrl || person.metricDocuments?.find(d => d.type === 'birth')?.url;
  const deathUrl = person.deathMetricUrl || person.metricDocuments?.find(d => d.type === 'death')?.url;

  const currentUrl = activeTab === 'birth' ? birthUrl : deathUrl;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);
      const url = await uploadFileToServer(file, { isDocument: true });

      // Create updated person object
      const existingDocs = person.metricDocuments || [];
      const docType = activeTab;
      
      const newDoc: MetricDocument = {
        id: `metric_${docType}_${Date.now()}`,
        type: docType,
        url,
        title: docType === 'birth' ? 'Метричний запис про народження' : 'Метричний запис про смерть',
        date: docType === 'birth' ? person.birthDate : person.deathDate,
      };

      // Filter out existing doc of same type and add new
      const updatedDocs = [
        ...existingDocs.filter(d => d.type !== docType),
        newDoc,
      ];

      const updatedPerson: Person = {
        ...person,
        birthMetricUrl: docType === 'birth' ? url : person.birthMetricUrl,
        deathMetricUrl: docType === 'death' ? url : person.deathMetricUrl,
        metricDocuments: updatedDocs,
      };

      onSave(updatedPerson);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося завантажити фотографію метрики');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteMetric = () => {
    const docType = activeTab;
    const existingDocs = person.metricDocuments || [];
    const updatedDocs = existingDocs.filter(d => d.type !== docType);

    const updatedPerson: Person = {
      ...person,
      birthMetricUrl: docType === 'birth' ? undefined : person.birthMetricUrl,
      deathMetricUrl: docType === 'death' ? undefined : person.deathMetricUrl,
      metricDocuments: updatedDocs.length > 0 ? updatedDocs : undefined,
    };

    onSave(updatedPerson);
  };

  const personName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Особа';

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Метрична книга та архівні документи
              </h3>
              <p className="text-xs text-stone-300">
                {personName} {person.yearsDisplay ? `(${person.yearsDisplay})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Закрити"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation: Birth vs Death Metric */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-4 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('birth')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeTab === 'birth'
                ? 'bg-white text-emerald-950 border-stone-200 border-b-white -mb-px shadow-2xs'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-100'
            }`}
          >
            <Calendar size={14} className={activeTab === 'birth' ? 'text-emerald-700' : 'text-stone-400'} />
            <span>Запис про народження</span>
            {birthUrl && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Є фото метрики" />
            )}
          </button>

          {person.isDeceased && (
            <button
              type="button"
              onClick={() => setActiveTab('death')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
                activeTab === 'death'
                  ? 'bg-white text-emerald-950 border-stone-200 border-b-white -mb-px shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-100'
              }`}
            >
              <FileText size={14} className={activeTab === 'death' ? 'text-emerald-700' : 'text-stone-400'} />
              <span>Запис про смерть</span>
              {deathUrl && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Є фото метрики" />
              )}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">✕</button>
            </div>
          )}

          {/* Date Info Summary */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-500 font-medium">
                {activeTab === 'birth' ? 'Дата народження:' : 'Дата смерті:'}
              </span>
              <span className="font-bold text-stone-900 font-mono ml-2">
                {activeTab === 'birth'
                  ? person.birthDate || person.birthYear || 'Не вказана'
                  : person.deathDate || person.deathYear || 'Не вказана'}
              </span>
            </div>
            {currentUrl ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                <Camera size={13} className="text-amber-800" />
                <span>Фото з метрики завантажено</span>
              </span>
            ) : (
              <span className="text-stone-400 text-[11px] font-medium">
                Фото метричної книги відсутнє
              </span>
            )}
          </div>

          {/* Image Display or Dropzone */}
          {currentUrl ? (
            <div className="space-y-3">
              <div className="relative group rounded-xl border border-stone-300 overflow-hidden bg-stone-900 max-h-[50vh] flex items-center justify-center shadow-inner">
                <img
                  src={currentUrl}
                  alt={`Метрика (${activeTab === 'birth' ? 'народження' : 'смерть'})`}
                  className="max-h-[50vh] w-auto object-contain transition-transform group-hover:scale-[1.01]"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white text-stone-900 font-bold text-xs shadow-lg flex items-center gap-1.5 hover:bg-stone-100 transition-transform active:scale-95"
                  >
                    <ExternalLink size={14} />
                    <span>Відкрити у повному розмірі</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons: Replace / Delete */}
              <div className="flex items-center justify-between pt-1">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition-colors shadow-2xs active:scale-95">
                  <Upload size={14} className="text-emerald-700" />
                  <span>{isUploading ? 'Завантаження...' : 'Замінити фото з метрики'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDeleteMetric}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-800 transition-colors cursor-pointer active:scale-95"
                >
                  <Trash2 size={14} />
                  <span>Видалити фото</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-stone-50/50 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                <Camera size={24} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  Завантажити фото з метричної книги
                </h4>
                <p className="text-xs text-stone-500 mt-0.5 max-w-sm">
                  Прикріпіть фотографію сторінки метричної книги або актового запису цивільного стану для підтвердження дати
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all active:scale-95">
                <Upload size={15} />
                <span>{isUploading ? 'Завантаження...' : 'Обрати файл фотографії'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-500 italic">
            💡 Фотографії з метричних книг зберігаються у картці особи та показують розпізнавальний знак фотоапарата біля дат.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
