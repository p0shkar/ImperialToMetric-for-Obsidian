import { parseNumberUnit, detectSystemFromText, toBaseVariant } from './convert';

function textOffsetAtPoint(line: HTMLElement, x: number, y: number): number | null{
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caret = documentWithCaret.caretPositionFromPoint?.(x, y);
  const range = caret ? null : documentWithCaret.caretRangeFromPoint?.(x, y);
  const node = caret?.offsetNode || range?.startContainer;
  const offset = caret?.offset ?? range?.startOffset;
  if (!node || offset == null || node.nodeType !== Node.TEXT_NODE || !line.contains(node)) return null;

  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let textOffset = 0;
  let current = walker.nextNode();
  while (current){
    if (current === node) return textOffset + Math.min(offset, current.textContent?.length || 0);
    textOffset += current.textContent?.length || 0;
    current = walker.nextNode();
  }
  return null;
}

function hideTooltip(plugin: any){
  if (plugin.tooltipEl?.isConnected) plugin.tooltipEl.remove();
  plugin.tooltipEl = null;
}

export function measurementAtOffset(parsed: any, text: string, offset: number, tonType: 'short'|'metric' = 'short'): string | null{
  if (parsed.range && offset >= parsed.index && offset <= parsed.index + parsed.raw.length) return parsed.raw;
  if (!parsed.parts) return null;

  const groups: Array<{ start: number; end: number; category: string }> = [];
  for (const part of parsed.parts){
    const value = toBaseVariant(part.value, part.unit, tonType);
    if (!value) continue;
    const previous = groups[groups.length - 1];
    const gap = previous ? text.slice(previous.end, part.index) : '';
    if (previous && previous.category === value.cat && value.cat !== 'temperature' && /^\s*$/.test(gap)){
      previous.end = part.index + part.raw.length;
    } else {
      groups.push({ start: part.index, end: part.index + part.raw.length, category: value.cat });
    }
  }

  const group = groups.find(candidate => offset >= candidate.start && offset <= candidate.end);
  return group ? text.slice(group.start, group.end) : null;
}

export function enableHover(plugin: any){
  if (plugin.hoverHandler) return;
  plugin.hoverHandler = (e: MouseEvent) => {
    const now = Date.now();
    if (now - (plugin.lastHoverAt || 0) < 80) return;
    plugin.lastHoverAt = now;
    const t = e.target as HTMLElement;
    const line = t ? t.closest('.cm-line') as HTMLElement : null;
    const text = line?.textContent || '';
    const offset = line ? textOffsetAtPoint(line, e.clientX, e.clientY) : null;
    const parsed = text ? parseNumberUnit(text) : null;

    if (!parsed || offset == null) {
      hideTooltip(plugin);
      return;
    }

    const raw = measurementAtOffset(parsed, text, offset, plugin.settings.imperialTonType);
    if (!raw){
      hideTooltip(plugin);
      return;
    }
    const detected = detectSystemFromText(raw);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(raw, target as any, plugin.settings.hoverDecimals);
    if (!converted) {
      hideTooltip(plugin);
      return;
    }

    const x = e.clientX + 12;
    const y = e.clientY + 12;

    if (plugin.tooltipEl) {
      plugin.tooltipEl.style.left = x + 'px';
      plugin.tooltipEl.style.top = y + 'px';
      plugin.tooltipEl.style.background = plugin.settings.hoverBackgroundColor || 'var(--background-modifier-success)';
      plugin.tooltipEl.textContent = converted;
      return;
    }

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.pointerEvents = 'none';
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.background = plugin.settings.hoverBackgroundColor || 'var(--background-modifier-success)';
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
