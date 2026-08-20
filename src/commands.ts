import { detectSystemFromText } from './convert';
import { PromptModal } from './ui';
import { enableHover, disableHover } from './hover';
import { Notice, MarkdownView } from 'obsidian';

export function registerCommands(plugin: any){
  // Convert selection (auto-detect)
  plugin.addCommand({ id: 'convert-selection-auto', name: 'Convert selection', editorCallback: (editor:any)=>{
    const sel = editor.getSelection(); if (!sel) { new Notice('No selection to convert'); return; }
    const detected = detectSystemFromText(sel);
    if (!detected) { new Notice('Could not detect measurement system'); return; }
    const target = detected === 'imperial' ? 'metric' : 'imperial';
    const out = plugin.convertText(sel, target as any);
    if (!out) { new Notice('Could not parse measurement'); return; }
    editor.replaceSelection(out);
  }});

  // Convert input (auto-detect via simple prompt to avoid editor side-effects)
  plugin.addCommand({ id: 'convert-input-auto', name: 'Convert input', callback: ()=>{
    const modal = new PromptModal(plugin.app, (val)=>{
      const detected = detectSystemFromText(val);
      if (!detected) { new Notice('Could not detect measurement system'); return; }
      const target = detected === 'imperial' ? 'metric' : 'imperial';
      const out = plugin.convertText(val, target as any);
      if (!out) { new Notice('Could not parse measurement'); return; }
      new Notice(out);
    });
    modal.open();
  }});

  // Toggle inline hover previews
  plugin.addCommand({ id: 'toggle-inline-previews', name: 'Toggle inline conversion previews (hover)', callback: async ()=>{
    plugin.inlineHoverEnabled = !plugin.inlineHoverEnabled;
    if (plugin.inlineHoverEnabled){
      enableHover(plugin);
      new Notice('Inline conversion preview enabled');
    } else {
      disableHover(plugin);
      new Notice('Inline conversion preview disabled');
    }
    plugin.settings.inlineHoverEnabled = plugin.inlineHoverEnabled;
    await plugin.saveSettings();
  }});

  // Toggle auto-convert on paste (command palette)
  plugin.addCommand({ id: 'toggle-auto-convert-on-paste', name: 'Toggle auto-convert on paste', callback: async ()=>{
    const v = !plugin.settings.autoConvertOnPaste;
    plugin.settings.autoConvertOnPaste = v;
    try { document.removeEventListener('paste', plugin.pasteHandler, true); } catch(e){}
    if (v && plugin.pasteHandler) document.addEventListener('paste', plugin.pasteHandler, true);
    await plugin.saveSettings();
    new Notice(v ? 'Auto-convert on paste enabled' : 'Auto-convert on paste disabled');
  }});

  // Editor context menu: group actions under a submenu
  plugin.registerEvent(plugin.app.workspace.on('editor-menu', (menu: any, editor: any, view: any) => {
    const sel = editor.getSelection();
    menu.addItem((mi: any) => {
      mi.setTitle('Imperial ⇄ Metric').setIcon('swap-horizontal');
      const sub = mi.setSubmenu();
      if (sel && sel.trim().length > 0) {
        sub.addItem((item: any) => {
          item.setTitle('Convert selection').setIcon('arrow-right').onClick(() => {
            const detected = detectSystemFromText(sel);
            const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
            const out = plugin.convertText(sel, target as any);
            if (!out) { new Notice('Could not parse measurement'); return; }
            editor.replaceSelection(out);
          });
        });
        sub.addItem((item: any) => {
          item.setTitle('Insert original + converted').setIcon('document').onClick(() => {
            const detected = detectSystemFromText(sel);
            const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
            const converted = plugin.convertText(sel, target as any);
            if (!converted) { new Notice('Could not parse measurement'); return; }
            editor.replaceSelection(`${sel.trim()} (${converted.trim()})`);
          });
        });
      }
      sub.addItem((item: any) => {
        item.setTitle('Toggle inline hover preview').setIcon('eye').onClick(async () => {
          plugin.inlineHoverEnabled = !plugin.inlineHoverEnabled;
          if (plugin.inlineHoverEnabled) enableHover(plugin); else disableHover(plugin);
          plugin.settings.inlineHoverEnabled = plugin.inlineHoverEnabled;
          await plugin.saveSettings();
          new Notice(plugin.inlineHoverEnabled ? 'Inline conversion preview enabled' : 'Inline conversion preview disabled');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle('Toggle auto-convert on paste').setIcon('clipboard').onClick(async () => {
          const v = !plugin.settings.autoConvertOnPaste;
          plugin.settings.autoConvertOnPaste = v;
          try { document.removeEventListener('paste', plugin.pasteHandler, true); } catch(e){}
          if (v && plugin.pasteHandler) document.addEventListener('paste', plugin.pasteHandler, true);
          await plugin.saveSettings();
          new Notice(v ? 'Auto-convert on paste enabled' : 'Auto-convert on paste disabled');
        });
      });

      // Convert input via right-click menu
      sub.addItem((item: any) => {
        item.setTitle('Convert input').setIcon('document').onClick(() => {
          const modal = new PromptModal(plugin.app, (val)=>{
            const detected = detectSystemFromText(val);
            if (!detected) { new Notice('Could not detect measurement system'); return; }
            const target = detected === 'imperial' ? 'metric' : 'imperial';
            const out = plugin.convertText(val, target as any);
            if (!out) { new Notice('Could not parse measurement'); return; }
            new Notice(out);
          });
          modal.open();
        });
      });
    });
  }));

  // Insert original + converted command
  plugin.addCommand({ id: 'insert-original-with-conversion', name: 'Insert original + converted', editorCallback: (editor:any)=>{
    const sel = editor.getSelection(); if (!sel) { new Notice('No selection to convert'); return; }
    const detected = detectSystemFromText(sel);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(sel, target as any);
    if (!converted) { new Notice('Could not parse measurement'); return; }
    const out = `${sel.trim()} (${converted.trim()})`;
    editor.replaceSelection(out);
  }});

  // Paste handler
  // Use a global-stored handler so reloads reuse the same function reference
  const globalKey = '__imperialMetricPasteHandler';
  let globalHandler = (globalThis as any)[globalKey] as ((e: ClipboardEvent)=>void) | undefined;
  if (!globalHandler) {
    globalHandler = (e: ClipboardEvent) => {
      try {
        const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
        if (!text) return;
        // auto-detect system like Insert original + converted
        const detected = detectSystemFromText(text);
        const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
        const converted = plugin.convertText(text, target as any);
        if (!converted) return;
        const mv = plugin.app.workspace.getActiveViewOfType(MarkdownView) as any;
        if (mv && mv.editor && mv.containerEl.contains(document.activeElement)){
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.stopPropagation) e.stopPropagation();
          // Insert original + converted with spacing
          mv.editor.replaceSelection(`${text.trim()} (${converted.trim()})`);
        }
      } catch(err){ /* ignore */ }
    };
    (globalThis as any)[globalKey] = globalHandler;
  }
  plugin.pasteHandler = globalHandler;
  // Ensure we don't register the paste handler multiple times (use capture so we intercept before Obsidian)
  try { document.removeEventListener('paste', plugin.pasteHandler, true); } catch(e) { /* ignore */ }
  if (plugin.settings.autoConvertOnPaste){ document.addEventListener('paste', plugin.pasteHandler, true); }
}
