import React, { useState } from 'react';
import {
  Sparkles,
  GitBranch,
  CircleDot,
  Layers,
  Sliders,
  Check,
  X,
  Info,
  Maximize2,
} from 'lucide-react';
import { LayoutMode, LayoutOptions } from '../utils/autoLayout';

interface AutoLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLayout: (options: LayoutOptions) => void;
  personCount: number;
  generationCount: number;
  selectedPersonName?: string;
  hasSelectedPerson: boolean;
}

export const AutoLayoutModal: React.FC<AutoLayoutModalProps> = ({
  isOpen,
  onClose,
  onApplyLayout,
  personCount,
  generationCount,
  selectedPersonName,
  hasSelectedPerson,
}) => {
  const [selectedMode, setSelectedMode] = useState<LayoutMode>('classic');
  const [generationGap, setGenerationGap] = useState<number>(230);
  const [cardGap, setCardGap] = useState<number>(44);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyLayout({
      mode: selectedMode,
      generationGap,
      cardGap,
      branchGap: cardGap + 20,
    });
    onClose();
  };

  const layoutCards: {
    id: LayoutMode;
    title: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
    benefits: string[];
  }[] = [
    {
      id: 'classic',
      title: 'Класичне поколінне дерево',
      badge: 'Рекомендовано',
      description:
        'Ієрархія зверху-вниз з ідеальним розподілом за поколіннями. Батьки центруються над дітьми, а лінії звʼязків не перетинаються.',
      icon: <GitBranch className="w-5 h-5 text-emerald-600" />,
      benefits: [
        'Дідусі та прадідусі на однакових фіксованих рівнях',
        'Рівна відстань між поколіннями та між картками',
        'Плавні лінії звʼязків без нагромаджень',
      ],
    },
    {
      id: 'radial',
      title: 'Сферично-радіальне дерево',
      badge: 'Сферична форма',
      description:
        'Концентричні кола поколінь, що розходяться від найстаршого предка або вибраної особи у всіх напрямках нескінченного полотна.',
      icon: <CircleDot className="w-5 h-5 text-amber-600" />,
      benefits: [
        'Кільця поколінь з однаковим радіальним кроком',
        'Чудово підходить для великих розгалужених родин',
        'Зручний 360-градусний огляд усіх гілок',
      ],
    },
    {
      id: 'butterfly',
      title: 'Двостороннє дерево (Метелик)',
      badge: 'Центроване',
      description:
        'Пращури розгалужуються вгору, а нащадки — вниз від центральної обраної особи чи подружжя. Формує збалансовану піраміду.',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      benefits: [
        hasSelectedPerson
          ? `Центр на: ${selectedPersonName}`
          : 'Автоматичний вибір ключової особи',
        'Чіткий поділ на предків та нащадків',
        'Компактна форма без розтягування по горизонталі',
      ],
    },
    {
      id: 'snapGrid',
      title: 'Вирівняти за лініями поколінь',
      badge: 'Швидке вирівнювання',
      description:
        'Зберігає ваше поточне розташування зліва направо, але ідеально притягує кожну картку до чіткого горизонтального рівня її покоління.',
      icon: <Maximize2 className="w-5 h-5 text-teal-600" />,
      benefits: [
        'Не ламає ваш звичний порядок карток',
        'Усуває перекоси по вертикалі та накладання',
        'Гарантує мінімальну відстань між картками',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif-heritage">
                Автоматичне адаптивне впорядкування
              </h3>
              <p className="text-xs text-stone-500">
                Чіткий розподіл за поколіннями, рівні відстані та плавні лінії без перетинів
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Stats Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Дерево містить <strong>{personCount}</strong> осіб у <strong>{generationCount}</strong> поколіннях
              </span>
            </div>
            <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
              Нескінченне полотно
            </span>
          </div>

          {/* Mode Selector Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Оберіть форму та геометрію дерева:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {layoutCards.map((card) => {
                const isSelected = selectedMode === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedMode(card.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer select-none text-left flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {card.icon}
                          <span className="font-bold text-sm text-stone-900">
                            {card.title}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <span className="inline-block px-2 py-0.5 mb-2 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-stone-100 text-stone-600">
                        {card.badge}
                      </span>

                      <p className="text-xs text-stone-600 leading-relaxed mb-3">
                        {card.description}
                      </p>
                    </div>

                    <ul className="space-y-1 pt-2 border-t border-stone-100">
                      {card.benefits.map((b, i) => (
                        <li key={i} className="text-[11px] text-stone-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Spacing Options */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Сховати точні налаштування відступів' : 'Налаштувати відстані між поколіннями та картками'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 rounded-xl bg-stone-50 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium text-stone-700">
                    <span>Відстань між поколіннями (Y):</span>
                    <span className="font-bold text-emerald-800">{generationGap} px</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="300"
                    step="10"
                    value={generationGap}
                    onChange={(e) => setGenerationGap(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>Компактно (180px)</span>
                    <span>Стандарт (230px)</span>
                    <span>Просторо (300px)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-medium text-stone-700">
                    <span>Відстань між картками (X):</span>
                    <span className="font-bold text-emerald-800">{cardGap} px</span>
                  </div>
                  <input
                    type="range"
                    min="28"
                    max="72"
                    step="4"
                    value={cardGap}
                    onChange={(e) => setCardGap(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>Щільно (28px)</span>
                    <span>Оптимально (44px)</span>
                    <span>Широко (72px)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Дію можна скасувати комбінацією <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-mono text-[10px]">Ctrl+Z</kbd>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Застосувати розмітку</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
