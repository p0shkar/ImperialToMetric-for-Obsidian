import { detectSystemFromText, formatPasteOutput, resolveTargetSystem } from './convert';
import { PromptModal } from './ui';
import { enableHover, disableHover } from './hover';
import { Notice, MarkdownView } from 'obsidian';

const PASTE_HANDLER_REGISTRY = (globalThis as any).__imperialMetricPasteHandlers ??= new WeakMap();

export function bindPasteHandler(plugin: any){
  if (plugin.pasteHandler) {
    try { document.removeEventListener('paste', plugin.pasteHandler, true); } catch(e){}
  }
  if (!plugin.settings.autoConvertOnPaste) return;
  if (!plugin.pasteHandler) {
    plugin.pasteHandler = (e: ClipboardEvent) => {
      try {
        const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
        if (!text) return;
        const detected = detectSystemFromText(text);
        const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
        const converted = plugin.convertText(text, target as any);
        if (!converted) return;
        const mv = plugin.app.workspace.getActiveViewOfType(MarkdownView) as any;
        if (mv && mv.editor && mv.containerEl.contains(document.activeElement)){
          e.preventDefault();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          if (e.stopPropagation) e.stopPropagation();
          mv.editor.replaceSelection(formatPasteOutput(text, converted, plugin.settings.pasteOutputMode));
        }
      } catch(err){ /* ignore */ }
    };
    PASTE_HANDLER_REGISTRY.set(plugin, plugin.pasteHandler);
  }
  document.addEventListener('paste', plugin.pasteHandler, true);
}

export function unbindPasteHandler(plugin: any){
  if (!plugin.pasteHandler) return;
  try { document.removeEventListener('paste', plugin.pasteHandler, true); } catch(e){}
  plugin.pasteHandler = null;
  PASTE_HANDLER_REGISTRY.delete(plugin);
}

function inlineHoverCommandName(enabled: boolean){
  return `${enabled ? 'Disable' : 'Enable'} inline conversion previews (hover)`;
}

function autoConvertPasteCommandName(enabled: boolean){
  return `${enabled ? 'Disable' : 'Enable'} auto-convert on paste`;
}

function convertInput(plugin: any, value: string, choice: 'auto'|'metric'|'imperial' = 'auto'): string | null{
  const detected = detectSystemFromText(value);
  const target = choice === 'auto' ? resolveTargetSystem(detected, 'auto', plugin.settings.defaultTarget) : choice;
  const converted = plugin.convertText(value, target);
  if (!converted) { new Notice('Could not parse measurement'); return null; }
  return converted;
}

function openConvertInputModal(plugin: any, editor?: any, defaultTarget: 'auto'|'metric'|'imperial' = 'auto'){
  const targetEditor = editor || plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  const modal = new PromptModal(
    plugin.app,
    (value, target) => {
      const converted = convertInput(plugin, value, target ?? defaultTarget);
      if (converted) new Notice(converted);
    },
    (value, target) => {
      const converted = convertInput(plugin, value, target ?? defaultTarget);
      if (!converted) return;
      if (!targetEditor) { new Notice('No active editor to insert into'); return; }
      targetEditor.replaceSelection(converted);
      new Notice('Converted value inserted');
    },
    (value, target) => {
      const converted = convertInput(plugin, value, target ?? defaultTarget);
      if (!converted) return;
      if (!targetEditor) { new Notice('No active editor to insert into'); return; }
      targetEditor.replaceSelection(formatPasteOutput(value, converted, 'original-and-converted'));
      new Notice('Original + converted inserted');
    },
    undefined,
    defaultTarget
  );
  modal.open();
}

export function registerCommands(plugin: any){
  // Convert input (prompt with explicit target choice)
  plugin.addCommand({ id: 'convert-input-auto', name: 'Convert input: Auto', callback: ()=>{
    openConvertInputModal(plugin, undefined, 'auto');
  }});
  plugin.addCommand({ id: 'convert-input-metric', name: 'Convert input: Metric', callback: ()=>{
    openConvertInputModal(plugin, undefined, 'metric');
  }});
  plugin.addCommand({ id: 'convert-input-imperial', name: 'Convert input: Imperial', callback: ()=>{
    openConvertInputModal(plugin, undefined, 'imperial');
  }});

  plugin.updateToggleCommandNames = () => {
    const prefix = `${plugin.manifest.name}: `;
    if (plugin.inlineHoverCommand) plugin.inlineHoverCommand.name = prefix + inlineHoverCommandName(plugin.inlineHoverEnabled);
    if (plugin.autoConvertPasteCommand) plugin.autoConvertPasteCommand.name = prefix + autoConvertPasteCommandName(plugin.settings.autoConvertOnPaste);
  };

  plugin.inlineHoverCommand = plugin.addCommand({ id: 'toggle-inline-previews', name: inlineHoverCommandName(plugin.inlineHoverEnabled), callback: async ()=>{
    plugin.inlineHoverEnabled = !plugin.inlineHoverEnabled;
    if (plugin.inlineHoverEnabled){
      enableHover(plugin);
      new Notice('Inline conversion preview enabled');
    } else {
      disableHover(plugin);
      new Notice('Inline conversion preview disabled');
    }
    plugin.settings.inlineHoverEnabled = plugin.inlineHoverEnabled;
    plugin.updateToggleCommandNames();
    await plugin.saveSettings();
  }});

  plugin.autoConvertPasteCommand = plugin.addCommand({ id: 'toggle-auto-convert-on-paste', name: autoConvertPasteCommandName(plugin.settings.autoConvertOnPaste), callback: async ()=>{
    const v = !plugin.settings.autoConvertOnPaste;
    plugin.settings.autoConvertOnPaste = v;
    if (v) bindPasteHandler(plugin); else unbindPasteHandler(plugin);
    plugin.updateToggleCommandNames();
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
            const converted = plugin.convertText(sel, target as any);
            if (!converted) { new Notice('Could not parse measurement'); return; }
            editor.replaceSelection(converted.trim());
          });
        });
        sub.addItem((item: any) => {
          item.setTitle('Convert selection: original + converted').setIcon('arrow-right').onClick(() => {
            const detected = detectSystemFromText(sel);
            const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
            const converted = plugin.convertText(sel, target as any);
            if (!converted) { new Notice('Could not parse measurement'); return; }
            editor.replaceSelection(`${sel.trim()} (${converted.trim()})`);
          });
        });
      }
      sub.addItem((item: any) => {
        item.setTitle(inlineHoverCommandName(plugin.inlineHoverEnabled)).setIcon('eye').onClick(async () => {
          plugin.inlineHoverEnabled = !plugin.inlineHoverEnabled;
          if (plugin.inlineHoverEnabled) enableHover(plugin); else disableHover(plugin);
          plugin.settings.inlineHoverEnabled = plugin.inlineHoverEnabled;
          plugin.updateToggleCommandNames();
          await plugin.saveSettings();
          new Notice(plugin.inlineHoverEnabled ? 'Inline conversion preview enabled' : 'Inline conversion preview disabled');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle(autoConvertPasteCommandName(plugin.settings.autoConvertOnPaste)).setIcon('clipboard').onClick(async () => {
          const v = !plugin.settings.autoConvertOnPaste;
          plugin.settings.autoConvertOnPaste = v;
          if (v) bindPasteHandler(plugin); else unbindPasteHandler(plugin);
          plugin.updateToggleCommandNames();
          await plugin.saveSettings();
          new Notice(v ? 'Auto-convert on paste enabled' : 'Auto-convert on paste disabled');
        });
      });

      // Convert input via right-click menu
      sub.addItem((item: any) => {
        item.setTitle('Convert input: Auto').setIcon('arrow-right').onClick(() => {
          openConvertInputModal(plugin, editor, 'auto');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle('Convert input: Metric').setIcon('arrow-right').onClick(() => {
          openConvertInputModal(plugin, editor, 'metric');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle('Convert input: Imperial').setIcon('arrow-right').onClick(() => {
          openConvertInputModal(plugin, editor, 'imperial');
        });
      });
    });
  }));

  // Selection conversion commands
  plugin.addCommand({ id: 'convert-selection', name: 'Convert selection', editorCallback: (editor:any)=>{
    const sel = editor.getSelection(); if (!sel) { new Notice('No selection to convert'); return; }
    const detected = detectSystemFromText(sel);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(sel, target as any);
    if (!converted) { new Notice('Could not parse measurement'); return; }
    editor.replaceSelection(converted.trim());
  }});
  plugin.addCommand({ id: 'convert-selection-original-with-conversion', name: 'Convert selection: original + converted', editorCallback: (editor:any)=>{
    const sel = editor.getSelection(); if (!sel) { new Notice('No selection to convert'); return; }
    const detected = detectSystemFromText(sel);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(sel, target as any);
    if (!converted) { new Notice('Could not parse measurement'); return; }
    const out = `${sel.trim()} (${converted.trim()})`;
    editor.replaceSelection(out);
  }});


  // Paste handler
  // Keep the handler scoped to the current plugin instance so stale closures do not survive reloads or toggles.
  if (plugin.settings.autoConvertOnPaste) {
    bindPasteHandler(plugin);
  } else {
    unbindPasteHandler(plugin);
  }
}
