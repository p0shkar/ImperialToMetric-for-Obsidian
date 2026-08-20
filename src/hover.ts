import { parseNumberUnit, detectSystemFromText } from './convert';

export function enableHover(plugin: any){
  if (plugin.hoverHandler) return;
  plugin.hoverHandler = (e: MouseEvent) => {
    const now = Date.now();
    if (now - (plugin.lastHoverAt || 0) < 80) return;
    plugin.lastHoverAt = now;
    const t = e.target as HTMLElement;
    const line = t ? t.closest('.cm-line') as HTMLElement : null;
    const text = line ? (line.textContent || '') : '';
    const parsed = text ? parseNumberUnit(text) : null;

    if (!parsed) {
      if (plugin.tooltipEl) { document.body.removeChild(plugin.tooltipEl); plugin.tooltipEl = null; }
      return;
    }

    const raw = (parsed as any).parts ? (parsed as any).parts[0].raw : (parsed as any).raw;
    const detected = detectSystemFromText(raw);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(raw, target as any, plugin.settings.hoverDecimals);
    if (!converted) {
      if (plugin.tooltipEl) { document.body.removeChild(plugin.tooltipEl); plugin.tooltipEl = null; }
      return;
    }

    const x = e.clientX + 12;
    const y = e.clientY + 12;

    if (plugin.tooltipEl) {
      plugin.tooltipEl.style.left = x + 'px';
      plugin.tooltipEl.style.top = y + 'px';
      plugin.tooltipEl.textContent = converted;
      return;
    }

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.background = 'var(--background-modifier-success)';
    div.style.color = 'var(--text-muted)';
    div.style.padding = '6px 8px';
    div.style.borderRadius = '6px';
    div.style.zIndex = '9999';
    div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    div.textContent = converted;
    document.body.appendChild(div);
    plugin.tooltipEl = div;
  };
  document.addEventListener('mousemove', plugin.hoverHandler);
  plugin.inlineHoverEnabled = true;
}

export function disableHover(plugin: any){
  if (plugin.hoverHandler) { document.removeEventListener('mousemove', plugin.hoverHandler); plugin.hoverHandler = null; }
  if (plugin.tooltipEl){ document.body.removeChild(plugin.tooltipEl); plugin.tooltipEl = null; }
  plugin.inlineHoverEnabled = false;
}
