import { detectSystemFromText, formatPasteOutput, resolveTargetSystem } from './convert';
import { PromptModal } from './ui';
import { enableHover, disableHover } from './hover';
import { Notice, MarkdownView } from 'obsidian';
import { autoConvertPasteCommandName, inlineHoverCommandName, registerEditorMenu } from './editor-menu';

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
  plugin.addCommand({ id: 'convert-input-auto', name: 'Convert input: Auto', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: 'A' }], callback: ()=>{
    openConvertInputModal(plugin, undefined, 'auto');
  }});
  plugin.addCommand({ id: 'convert-input-metric', name: 'Convert input: Metric', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: 'M' }], callback: ()=>{
    openConvertInputModal(plugin, undefined, 'metric');
  }});
  plugin.addCommand({ id: 'convert-input-imperial', name: 'Convert input: Imperial', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: 'I' }], callback: ()=>{
    openConvertInputModal(plugin, undefined, 'imperial');
  }});

  plugin.updateToggleCommandNames = () => {
    const prefix = `${plugin.manifest.name}: `;
    if (plugin.inlineHoverCommand) plugin.inlineHoverCommand.name = prefix + inlineHoverCommandName(plugin.inlineHoverEnabled);
    if (plugin.autoConvertPasteCommand) plugin.autoConvertPasteCommand.name = prefix + autoConvertPasteCommandName(plugin.settings.autoConvertOnPaste);
  };

  plugin.inlineHoverCommand = plugin.addCommand({ id: 'toggle-inline-previews', name: inlineHoverCommandName(plugin.inlineHoverEnabled), hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'H' }], callback: async ()=>{
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

  plugin.autoConvertPasteCommand = plugin.addCommand({ id: 'toggle-auto-convert-on-paste', name: autoConvertPasteCommandName(plugin.settings.autoConvertOnPaste), hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'P' }], callback: async ()=>{
    const v = !plugin.settings.autoConvertOnPaste;
    plugin.settings.autoConvertOnPaste = v;
    if (v) bindPasteHandler(plugin); else unbindPasteHandler(plugin);
    plugin.updateToggleCommandNames();
    await plugin.saveSettings();
    new Notice(v ? 'Auto-convert on paste enabled' : 'Auto-convert on paste disabled');
  }});

  registerEditorMenu(plugin, {
    openConvertInputModal: (editor, target) => openConvertInputModal(plugin, editor, target),
    bindPasteHandler: () => bindPasteHandler(plugin),
    unbindPasteHandler: () => unbindPasteHandler(plugin)
  });

  // Selection conversion commands
  plugin.addCommand({ id: 'convert-selection', name: 'Convert selection', hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'M' }], editorCallback: (editor:any)=>{
    const sel = editor.getSelection(); if (!sel) { new Notice('No selection to convert'); return; }
    const detected = detectSystemFromText(sel);
    const target = detected === 'imperial' ? 'metric' : (detected === 'metric' ? 'imperial' : plugin.settings.defaultTarget);
    const converted = plugin.convertText(sel, target as any);
    if (!converted) { new Notice('Could not parse measurement'); return; }
    editor.replaceSelection(converted.trim());
  }});
  plugin.addCommand({ id: 'convert-selection-original-with-conversion', name: 'Convert selection: original + converted', hotkeys: [{ modifiers: ['Mod', 'Alt', 'Shift'], key: 'M' }], editorCallback: (editor:any)=>{
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
