/**
 * Authentic Ukrainian heraldic coat of arms SVG generator.
 * Creates clean, scalable, beautiful vector family crests with traditional escutcheon shields,
 * ornate mantling, crowns/helms, central heraldic charges, and ribbons with mottos.
 */

export interface HeraldicOptions {
  clanName: string;
  motto?: string;
  style?: 'classic' | 'cossack' | 'galician' | 'modern';
  symbol?: 'lion' | 'falcon' | 'cossack' | 'wheat' | 'cross' | 'sun';
  shieldColor?: 'azure' | 'gules' | 'vert' | 'sable' | 'purpure';
}

export function generateHeraldicSvg(opts: HeraldicOptions): string {
  const { clanName, motto, style = 'classic', symbol = 'lion', shieldColor = 'azure' } = opts;

  const bgColors: Record<string, { top: string; bottom: string; border: string }> = {
    azure: { top: '#1e3a8a', bottom: '#0f172a', border: '#f59e0b' }, // Royal Blue
    gules: { top: '#991b1b', bottom: '#450a0a', border: '#fbbf24' }, // Crimson
    vert: { top: '#065f46', bottom: '#022c22', border: '#fcd34d' }, // Emerald / Pine
    sable: { top: '#27272a', bottom: '#09090b', border: '#e4e4e7' }, // Noble Black / Silver
    purpure: { top: '#581c87', bottom: '#2e1065', border: '#fde047' }, // Imperial Purple
  };

  const scheme = bgColors[shieldColor] || bgColors.azure;
  const displayMotto = (motto || `РІД ${clanName.toUpperCase()}`).slice(0, 32);

  // Symbol charges
  let centerChargeSvg = '';
  if (symbol === 'falcon' || style === 'modern') {
    // Princely Falcon (Сокіл / Тризуб)
    centerChargeSvg = `
      <g transform="translate(100, 118) scale(0.95)">
        <path d="M 0 -36 C -10 -22, -18 -8, -26 12 C -28 17, -24 22, -18 20 C -12 18, -8 8, -6 0 L -6 28 C -6 32, -2 36, 0 36 C 2 36, 6 32, 6 28 L 6 0 C 8 8, 12 18, 18 20 C 24 22, 28 17, 26 12 C 18 -8, 10 -22, 0 -36 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <circle cx="0" cy="-28" r="4" fill="#fef3c7" />
        <path d="M -14 6 C -6 12, 6 12, 14 6" stroke="#78350f" stroke-width="1.5" fill="none" />
      </g>
    `;
  } else if (symbol === 'wheat') {
    // Golden Ears of Wheat (Колосся)
    centerChargeSvg = `
      <g transform="translate(100, 118) scale(0.9)">
        <!-- Left ear -->
        <path d="M -6 30 C -12 10, -18 -10, -22 -28 C -16 -24, -14 -16, -10 -10 C -6 -6, -4 4, -4 30 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <ellipse cx="-16" cy="-20" rx="4" ry="7" transform="rotate(-30, -16, -20)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        <ellipse cx="-12" cy="-8" rx="4.5" ry="7.5" transform="rotate(-25, -12, -8)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        <ellipse cx="-8" cy="6" rx="4.5" ry="8" transform="rotate(-20, -8, 6)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        
        <!-- Right ear -->
        <path d="M 6 30 C 12 10, 18 -10, 22 -28 C 16 -24, 14 -16, 10 -10 C 6 -6, 4 4, 4 30 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <ellipse cx="16" cy="-20" rx="4" ry="7" transform="rotate(30, 16, -20)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        <ellipse cx="12" cy="-8" rx="4.5" ry="7.5" transform="rotate(25, 12, -8)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        <ellipse cx="8" cy="6" rx="4.5" ry="8" transform="rotate(20, 8, 6)" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
        
        <!-- Central stem and star -->
        <line x1="0" y1="36" x2="0" y2="-24" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
        <circle cx="0" cy="-30" r="4.5" fill="#fef08a" stroke="#78350f" stroke-width="1" />
      </g>
    `;
  } else if (symbol === 'cross' || style === 'cossack') {
    // Cossack Knightly Cross (Козацький лапчастий хрест з променями)
    centerChargeSvg = `
      <g transform="translate(100, 116) scale(0.95)">
        <!-- Rays -->
        <path d="M -24 -24 L 24 24 M -24 24 L 24 -24" stroke="#fef08a" stroke-width="2.5" opacity="0.6" stroke-linecap="round" />
        <!-- Cross -->
        <path d="M -6 -8 L -28 -20 L -22 0 L -28 20 L -6 8 L -8 6 L -8 -6 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <path d="M 6 -8 L 28 -20 L 22 0 L 28 20 L 6 8 L 8 6 L 8 -6 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <path d="M -8 -6 L -20 -28 L 0 -22 L 20 -28 L 8 -6 L 6 -8 L -6 -8 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <path d="M -8 6 L -20 28 L 0 22 L 20 28 L 8 6 L 6 8 L -6 8 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
        <circle cx="0" cy="0" r="7" fill="#fef3c7" stroke="#78350f" stroke-width="1.5" />
        <circle cx="0" cy="0" r="3" fill="#b45309" />
      </g>
    `;
  } else {
    // Golden Galician Lion Rampant (Галицький Золотий Лев)
    centerChargeSvg = `
      <g transform="translate(94, 118) scale(0.72)">
        <!-- Lion Crown -->
        <path d="M 12 -42 L 6 -52 L 14 -47 L 22 -54 L 30 -47 L 38 -52 L 32 -42 Z" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
        <!-- Head & Mane -->
        <path d="M 10 -38 C 4 -32, 2 -22, 6 -16 C -4 -12, -8 -2, -6 8 C -8 14, -6 20, -2 26 C 2 34, 10 38, 18 36 C 26 34, 30 26, 30 18 C 34 8, 30 -6, 26 -16 C 28 -24, 24 -34, 14 -38 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <!-- Eye & Snout -->
        <circle cx="12" cy="-28" r="2.5" fill="#78350f" />
        <!-- Open Roaring Mouth -->
        <path d="M 6 -24 L -4 -20 L 4 -16 Z" fill="#991b1b" stroke="#78350f" stroke-width="1" />
        <!-- Forepaws rampant -->
        <path d="M 8 -10 C -4 -16, -16 -12, -24 -24 L -30 -18 C -22 -6, -12 2, 2 2 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <path d="M 12 4 C 2 -2, -10 6, -18 -4 L -24 2 C -16 14, -4 16, 6 12 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <!-- Claws -->
        <path d="M -30 -22 L -34 -24 M -28 -16 L -32 -16 M -24 0 L -28 2" stroke="#991b1b" stroke-width="2" stroke-linecap="round" />
        <!-- Body & Hind leg -->
        <path d="M 16 16 C 18 28, 16 42, 8 54 C 2 62, -8 64, -14 74 L -8 80 C 6 76, 18 70, 24 58 C 30 46, 28 26, 22 14 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <path d="M 22 46 C 30 54, 38 66, 36 78 L 44 80 C 46 64, 36 50, 26 40 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <!-- Tail rampant with tuft -->
        <path d="M 22 24 C 36 20, 48 10, 46 -4 C 44 -16, 32 -18, 36 -28 C 42 -22, 54 -12, 52 4 C 50 18, 38 32, 20 34 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
        <path d="M 36 -28 C 40 -34, 46 -32, 44 -26 C 42 -20, 36 -22, 36 -28 Z" fill="#fef08a" stroke="#78350f" stroke-width="1" />
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <!-- Rich Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="35%" stop-color="#f59e0b" />
      <stop offset="70%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>

    <!-- Shield Field Gradient -->
    <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${scheme.top}" />
      <stop offset="100%" stop-color="${scheme.bottom}" />
    </linearGradient>

    <!-- Ribbon Gradient -->
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fefce8" />
      <stop offset="50%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#fde047" />
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="crestShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <g filter="url(#crestShadow)">
    <!-- Ornate Outer Mantling (Геральдичний намет / Лаври) -->
    <g fill="url(#goldGrad)" stroke="#78350f" stroke-width="1">
      <!-- Left mantling flourishes -->
      <path d="M 40 45 C 20 40, 10 55, 16 75 C 20 90, 8 105, 14 125 C 18 138, 28 145, 34 135 C 38 128, 30 115, 32 95 C 34 78, 44 65, 40 45 Z" />
      <path d="M 22 55 C 8 62, 4 80, 12 95 C 16 85, 20 70, 26 65 Z" fill="#fef08a" />
      <path d="M 20 100 C 6 112, 12 135, 24 140 C 22 130, 20 118, 26 110 Z" fill="#fef08a" />
      
      <!-- Right mantling flourishes -->
      <path d="M 160 45 C 180 40, 190 55, 184 75 C 180 90, 192 105, 186 125 C 182 138, 172 145, 166 135 C 162 128, 170 115, 168 95 C 166 78, 156 65, 160 45 Z" />
      <path d="M 178 55 C 192 62, 196 80, 188 95 C 184 85, 180 70, 174 65 Z" fill="#fef08a" />
      <path d="M 180 100 C 194 112, 188 135, 176 140 C 178 130, 180 118, 174 110 Z" fill="#fef08a" />
    </g>

    <!-- Knightly Coronet / Crown at top -->
    <g transform="translate(100, 32)">
      <path d="M -32 14 L 32 14 L 36 2 L 20 8 L 0 -4 L -20 8 L -36 2 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.5" />
      <ellipse cx="-20" cy="8" rx="2.5" ry="2.5" fill="#ef4444" stroke="#78350f" stroke-width="0.8" />
      <ellipse cx="0" cy="-4" rx="3.5" ry="3.5" fill="#3b82f6" stroke="#78350f" stroke-width="0.8" />
      <ellipse cx="20" cy="8" rx="2.5" ry="2.5" fill="#ef4444" stroke="#78350f" stroke-width="0.8" />
      <rect x="-30" y="10" width="60" height="4" rx="2" fill="#fef08a" stroke="#78350f" stroke-width="0.8" />
    </g>

    <!-- Heraldic Shield (Escutcheon) -->
    <!-- Outer Shield Border -->
    <path d="M 46 44 C 82 44, 100 36, 100 36 C 100 36, 118 44, 154 44 C 158 90, 156 128, 100 176 C 44 128, 42 90, 46 44 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="2.5" />
    
    <!-- Inner Shield Field -->
    <path d="M 52 49 C 84 49, 100 42, 100 42 C 100 42, 116 49, 148 49 C 152 88, 150 122, 100 166 C 50 122, 48 88, 52 49 Z" fill="url(#fieldGrad)" stroke="#fde047" stroke-width="1.8" />

    <!-- Center Heraldic Charge Symbol -->
    ${centerChargeSvg}

    <!-- Motto Scroll Ribbon at bottom -->
    <g transform="translate(100, 196)">
      <!-- Ribbon Tails -->
      <path d="M -86 8 L -68 18 L -68 -4 L -86 4 Z" fill="#ca8a04" stroke="#78350f" stroke-width="1.2" />
      <path d="M 86 8 L 68 18 L 68 -4 L 86 4 Z" fill="#ca8a04" stroke="#78350f" stroke-width="1.2" />
      <!-- Ribbon Center Banner -->
      <path d="M -74 -3 C -30 -12, 30 -12, 74 -3 C 78 8, 76 16, 72 20 C 30 12, -30 12, -72 20 C -76 16, -78 8, -74 -3 Z" fill="url(#ribbonGrad)" stroke="#78350f" stroke-width="1.5" />
      
      <!-- Motto Text -->
      <text x="0" y="8" font-family="'Cormorant Garamond', 'Times New Roman', Georgia, serif" font-size="9" font-weight="bold" letter-spacing="1.2" fill="#451a03" text-anchor="middle">
        ${displayMotto}
      </text>
    </g>
  </g>
</svg>`;
}
