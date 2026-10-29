import { detectSystemFromText } from './convert';
import { disableHover, enableHover } from './hover';
import { Notice } from 'obsidian';

type InputTarget = 'auto'|'metric'|'imperial';

interface EditorMenuActions {
  openConvertInputModal: (editor: any, target: InputTarget) => void;
  bindPasteHandler: () => void;
  unbindPasteHandler: () => void;
}

export function inlineHoverCommandName(enabled: boolean){
  return `${enabled ? 'Disable' : 'Enable'} inline conversion previews (hover)`;
}

export function autoConvertPasteCommandName(enabled: boolean){
  return `${enabled ? 'Disable' : 'Enable'} auto-convert on paste`;
}

export function registerEditorMenu(plugin: any, actions: EditorMenuActions){
  plugin.registerEvent(plugin.app.workspace.on('editor-menu', (menu: any, editor: any) => {
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
          if (v) actions.bindPasteHandler(); else actions.unbindPasteHandler();
          plugin.updateToggleCommandNames();
          await plugin.saveSettings();
          new Notice(v ? 'Auto-convert on paste enabled' : 'Auto-convert on paste disabled');
        });
      });

      sub.addItem((item: any) => {
        item.setTitle('Convert input: Auto').setIcon('arrow-right').onClick(() => {
          actions.openConvertInputModal(editor, 'auto');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle('Convert input: Metric').setIcon('arrow-right').onClick(() => {
          actions.openConvertInputModal(editor, 'metric');
        });
      });
      sub.addItem((item: any) => {
        item.setTitle('Convert input: Imperial').setIcon('arrow-right').onClick(() => {
          actions.openConvertInputModal(editor, 'imperial');
        });
      });
    });
  }));
}
