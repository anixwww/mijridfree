import { FamilyTreeData } from '../types/tree';
import { CARD_WIDTH, CARD_HEIGHT, generateConnections } from './treeLayout';
import { getCardDates } from './dateUtils';
import { buildClanMap } from './lineageUtils';

/**
 * Builds a complete standalone SVG document of the family tree
 */
function generateFullTreeSvg(tree: FamilyTreeData): string {
  const persons = Object.values(tree.persons);
  if (persons.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><text x="400" y="300" text-anchor="middle" fill="#888">Дерево порожнє</text></svg>`;
  }

  // Calculate bounding box
  const padding = 80;
  const minX = Math.min(...persons.map((p) => p.x)) - padding;
  const minY = Math.min(...persons.map((p) => p.y)) - padding;
  const maxX = Math.max(...persons.map((p) => p.x + CARD_WIDTH)) + padding;
  const maxY = Math.max(...persons.map((p) => p.y + CARD_HEIGHT)) + padding;

  const width = Math.max(800, maxX - minX);
  const height = Math.max(600, maxY - minY);

  const clanMap = buildClanMap(tree.persons);
  const clanRecord = Object.fromEntries(clanMap.entries());

  const connections = generateConnections(
    tree.persons,
    tree.connectionOverrides,
    tree.verifiedColor || '#64748b',
    clanRecord
  );

  // Generate SVG lines (verified green / unverified gray / main branch)
  const linesSvg = connections
    .map(
      (c) =>
        `<path d="${c.path}" fill="none" stroke="${c.color}" stroke-width="${
          c.isMainBranch ? '3.5' : c.isVerified ? '2.0' : '1.6'
        }" stroke-dasharray="${c.isDashed ? '5,4' : 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n');

  // Generate SVG cards
  const cardsSvg = persons
    .map((p) => {
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || '?';
      const nickname = p.nickname ? `«${p.nickname}»` : '';

      const clan = clanRecord[p.lastName] || clanRecord[p.clanName || ''];
      const cardBg = p.cardBgColor || clan?.bgColor || '#f4f4f5';
      const cardBorder = clan?.borderColor || '#d4d4d8';

      // Avatar: if p.avatarUrl exists, use clipped <image>; otherwise use vector silhouette
      const avatarSvg = p.avatarUrl
        ? `<clipPath id="avatar-clip-${p.id}">
             <circle cx="${p.x + CARD_WIDTH / 2}" cy="${p.y + 30}" r="17"/>
           </clipPath>
           <image href="${escapeXml(p.avatarUrl)}" x="${p.x + CARD_WIDTH / 2 - 17}" y="${p.y + 13}" width="34" height="34" clip-path="url(#avatar-clip-${p.id})" preserveAspectRatio="xMidYMid slice"/>`
        : p.gender === 'female'
        ? `<ellipse cx="${p.x + CARD_WIDTH / 2}" cy="${p.y + 24}" rx="6" ry="5" fill="#333"/>
           <ellipse cx="${p.x + CARD_WIDTH / 2}" cy="${p.y + 31}" rx="8" ry="9" fill="#333"/>
           <path d="M ${p.x + CARD_WIDTH / 2 - 10} ${p.y + 47} C ${p.x + CARD_WIDTH / 2 - 6} ${p.y + 38}, ${p.x + CARD_WIDTH / 2 + 6} ${p.y + 38}, ${p.x + CARD_WIDTH / 2 + 10} ${p.y + 47} Z" fill="#333"/>`
        : p.gender === 'male'
        ? `<ellipse cx="${p.x + CARD_WIDTH / 2}" cy="${p.y + 29}" rx="8" ry="9" fill="#333"/>
           <path d="M ${p.x + CARD_WIDTH / 2 - 11} ${p.y + 47} C ${p.x + CARD_WIDTH / 2 - 6} ${p.y + 38}, ${p.x + CARD_WIDTH / 2 + 6} ${p.y + 38}, ${p.x + CARD_WIDTH / 2 + 11} ${p.y + 47} Z" fill="#333"/>`
        : `<text x="${p.x + CARD_WIDTH / 2}" y="${p.y + 35}" font-family="sans-serif" font-weight="bold" font-size="14" fill="#555" text-anchor="middle">?</text>`;

      const houseBadgeSvg = p.houseNumber
        ? `<g transform="translate(${p.x + CARD_WIDTH - 28}, ${p.y + 4})">
            <rect x="0" y="0" width="26" height="13" rx="4" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.9"/>
            <text x="13" y="9.5" font-family="monospace" font-size="7.5" font-weight="bold" fill="#1c1917" text-anchor="middle">№${escapeXml(
              p.houseNumber
            )}</text>
          </g>`
        : '';

      const datesInfo = getCardDates(p);
      const datesSvg = datesInfo.displayLine1
        ? datesInfo.isSingleLine
          ? `<text x="${p.x + CARD_WIDTH / 2}" y="${p.y + (nickname ? 98 : 90)}" font-family="monospace" font-size="8" fill="#57534e" text-anchor="middle">${escapeXml(datesInfo.displayLine1)}</text>`
          : `<text x="${p.x + CARD_WIDTH / 2}" y="${p.y + (nickname ? 94 : 86)}" font-family="monospace" font-size="7.8" fill="#44403c" text-anchor="middle">${escapeXml(datesInfo.displayLine1)}</text>
             <text x="${p.x + CARD_WIDTH / 2}" y="${p.y + (nickname ? 104 : 96)}" font-family="monospace" font-size="7.2" fill="#78716c" text-anchor="middle">${escapeXml(datesInfo.displayLine2)}</text>`
        : '';

      return `
      <g id="card-${p.id}">
        <!-- Card background with authentic colors -->
        <rect x="${p.x}" y="${p.y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="6" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.2"/>
        
        <!-- Avatar circle background -->
        <circle cx="${p.x + CARD_WIDTH / 2}" cy="${p.y + 30}" r="18" fill="#ffffff" stroke="${cardBorder}" stroke-width="1"/>
        ${avatarSvg}
        ${houseBadgeSvg}
        
        <!-- Person Name -->
        <text x="${p.x + CARD_WIDTH / 2}" y="${p.y + 68}" font-family="Plus Jakarta Sans, sans-serif" font-size="10.5" font-weight="600" fill="#1c1917" text-anchor="middle">
          ${escapeXml(fullName)}
        </text>
        
        ${
          nickname
            ? `<text x="${p.x + CARD_WIDTH / 2}" y="${p.y + 80}" font-family="Plus Jakarta Sans, sans-serif" font-size="9" font-style="italic" fill="#57534e" text-anchor="middle">${escapeXml(nickname)}</text>`
            : ''
        }
        
        <!-- Years (Birth and Death) -->
        ${datesSvg}
      </g>
    `;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
  <!-- Canvas background -->
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#f8faf8"/>
  
  <!-- Subtle Grid lines -->
  <defs>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e3ece5" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#grid)"/>

  <!-- Family Tree Title -->
  <text x="${minX + 40}" y="${minY + 45}" font-family="serif" font-size="22" font-weight="bold" fill="#2d372e">
    ${escapeXml(tree.title || 'Родовід')}
  </text>
  
  <!-- Connections Layer -->
  <g id="connections">
    ${linesSvg}
  </g>
  
  <!-- Cards Layer -->
  <g id="cards">
    ${cardsSvg}
  </g>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Downloads SVG file directly to user's computer
 */
export function downloadTreeSvgFile(tree: FamilyTreeData): void {
  const svgContent = generateFullTreeSvg(tree);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(tree.title || 'родовід').toLowerCase().replace(/\s+/g, '_')}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Renders SVG to HTML5 Canvas at 2x resolution and downloads PNG
 */
export function downloadTreePngFile(tree: FamilyTreeData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const svgString = generateFullTreeSvg(tree);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const scale = 2; // High-resolution export
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Не вдалося створити контекст канвасу'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            URL.revokeObjectURL(url);
            reject(new Error('Не вдалося створити PNG'));
            return;
          }
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${(tree.title || 'родовід').toLowerCase().replace(/\s+/g, '_')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Помилка завантаження SVG для генерації PNG'));
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}
