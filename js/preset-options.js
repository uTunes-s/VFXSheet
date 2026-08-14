// Shared grouped option rendering for camera and lens selectors.
import { presetCategories } from './preset-catalog-meta.js';
import { escapeHtml } from './utils.js';

export function renderPresetOptions(items, selectedName, includeFocal = false) {
  return presetCategories.map(category => {
    const group = items.filter(item => item.category === category);
    if (!group.length) return '';
    return `<optgroup label="${category}">${group.map(item => `<option value="${escapeHtml(item.name)}" ${includeFocal ? `data-focal="${escapeHtml(item.focal || '')}"` : ''} ${selectedName === item.name ? 'selected' : ''}>${escapeHtml(item.name)}${includeFocal && item.focal ? ` (${escapeHtml(item.focal)})` : ''}</option>`).join('')}</optgroup>`;
  }).join('');
}

// Public APIs are exposed only through named ES module exports.

