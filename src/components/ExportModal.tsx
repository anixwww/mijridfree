import React, {  } from 'react';
import { FamilyTreeData } from '../types/tree';
import { downloadTreeJson } from '../utils/fileStorage';
import { downloadGedcomFile } from '../utils/gedcomExport';
import { X, Image as ImageIcon, Download, Printer, FileCode } from 'lucide-react';

interface ExportModalProps {
  tree: FamilyTreeData;
  isOpen: boolean;
  onClose: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  tree,
  isOpen,
  onClose,
  onExportPng,
  onExportSvg,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f4f7f4] border-b border-[#d8e2d9] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">
            Експорт родового дерева
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* 1. Download JSON */}
          <button
            onClick={() => {
              downloadTreeJson(tree);
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <Download size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-900 flex items-center gap-1.5">
                <span>Файл проєкту (.json)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-normal">
                  Рекомендовано для редагування
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Зберігає всі картки, родинні зв'язки, фотографії та точні координати для відкриття пізніше.
              </p>
            </div>
          </button>

          {/* 2. Download GEDCOM (.ged) */}
          <button
            onClick={() => {
              downloadGedcomFile(tree);
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800 shrink-0">
              <FileCode size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900 group-hover:text-indigo-900 flex items-center gap-1.5">
                <span>Стандарт GEDCOM (.ged)</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded font-normal">
                  Для інших ген. програм
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Міжнародний формат генеалогічних даних для відкриття в MyHeritage, Gramps, Ancestry тощо.
              </p>
            </div>
          </button>

          {/* 3. Export PNG */}
          {/* 2. Export PNG */}
          <button
            onClick={() => {
              onExportPng();
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-sky-100 text-sky-800 shrink-0">
              <ImageIcon size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900 group-hover:text-sky-900">
                Зображення високої чіткості (.png)
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Готова фотографія вашого генеалогічного дерева для друку або надсилання рідним.
              </p>
            </div>
          </button>

          {/* 4. Export SVG */}
          {/* 3. Export SVG */}
          <button
            onClick={() => {
              onExportSvg();
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Download size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900 group-hover:text-amber-900">
                Векторний файл (.svg)
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Масштабований вектор без втрати якості на будь-якому розмірі (для плакатів та банерів).
              </p>
            </div>
          </button>

          {/* 5. Print */}
          {/* 4. Print */}
          <button
            onClick={() => {
              handlePrint();
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-purple-100 text-purple-800 shrink-0">
              <Printer size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900 group-hover:text-purple-900">
                Друкувати / Зберегти як PDF
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Відкриває вікно друку браузера для прямого друку або експорту в PDF документ.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
