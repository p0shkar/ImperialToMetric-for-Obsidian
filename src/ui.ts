import { Modal, PluginSettingTab, Setting, Notice } from 'obsidian';
import { enableHover, disableHover } from './hover';

export class PromptModal extends Modal {
  onSubmit: (val:string)=>void;
  onCloseCb?: ()=>void;
  constructor(app: any, onSubmit: (val:string)=>void, onCloseCb?: ()=>void){ super(app); this.onSubmit = onSubmit; this.onCloseCb = onCloseCb; }
  onOpen(){
    const { contentEl } = this;
    contentEl.createEl('h3', {text: 'Enter measurement to convert, e.g. "12 ft"'});
    const input = contentEl.createEl('input') as HTMLInputElement;
    input.type = 'text'; input.style.width = '100%';
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter'){
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        this.onSubmit(input.value);
        this.close();
      }
    });
    const btn = contentEl.createEl('button', {text:'Convert'});
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e as any).stopImmediatePropagation?.();
      this.onSubmit(input.value);
      this.close();
    });
    // Intentionally do not autofocus input to avoid stealing focus from the editor
  }
  onClose(){
    if (this.onCloseCb) this.onCloseCb();
  }
}

export class ImperialMetricSettingTab extends PluginSettingTab {
  plugin: any;
  constructor(app:any, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Imperial ⇄ Metric Converter settings' });

    new Setting(containerEl)
      .setName('Default target system')
      .setDesc('Default conversion target for the "Convert input (preferred units)" command')
      .addDropdown(drop => drop
        .addOption('metric','Metric')
        .addOption('imperial','Imperial')
        .setValue(this.plugin.settings.defaultTarget)
        .onChange(async (v) => { this.plugin.settings.defaultTarget = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Conversion decimal places')
      .setDesc('Number of decimals to show in converted values')
      .addText(text => text
        .setValue(String(this.plugin.settings.decimals))
        .onChange(async (v) => { const n = Math.max(0, Math.min(6, parseInt(v) || 0)); this.plugin.settings.decimals = n; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Hover decimal places')
      .setDesc('Number of decimals to show in hover/tooltip conversions')
      .addText(text => text
        .setValue(String(this.plugin.settings.hoverDecimals))
        .onChange(async (v) => { const n = Math.max(0, Math.min(6, parseInt(v) || 0)); this.plugin.settings.hoverDecimals = n; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Preferred metric length unit')
      .setDesc('Force metric length output to a specific unit (or Auto)')
      .addDropdown(drop => drop
        .addOption('auto','Auto')
        .addOption('m+cm','Meters + Centimeters')
        .addOption('mm','Millimeters')
        .addOption('cm','Centimeters')
        .addOption('m','Meters')
        .addOption('km','Kilometers')
        .setValue(this.plugin.settings.preferredMetricLengthUnit)
        .onChange(async (v) => { this.plugin.settings.preferredMetricLengthUnit = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Preferred imperial length unit')
      .setDesc('Force imperial length output to a specific unit (or Auto)')
      .addDropdown(drop => drop
        .addOption('auto','Auto')
        .addOption('in','Inches')
        .addOption('ft','Feet')
        .addOption('yd','Yards')
        .addOption('mi','Miles')
        .setValue(this.plugin.settings.preferredImperialLengthUnit)
        .onChange(async (v) => { this.plugin.settings.preferredImperialLengthUnit = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Preferred imperial mass unit')
      .setDesc('Force imperial mass output to a specific unit (or Auto)')
      .addDropdown(drop => drop
        .addOption('auto','Auto')
        .addOption('oz','Ounces')
        .addOption('lb','Pounds')
        .addOption('st','Stone')
        .addOption('ton','Ton')
        .setValue(this.plugin.settings.preferredImperialMassUnit)
        .onChange(async (v) => { this.plugin.settings.preferredImperialMassUnit = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Preferred imperial volume unit')
      .setDesc('Force imperial volume output to a specific unit (or Auto)')
      .addDropdown(drop => drop
        .addOption('auto','Auto')
        .addOption('cup','Cup')
        .addOption('pt','Pint')
        .addOption('gal','Gallon')
        .setValue(this.plugin.settings.preferredImperialVolumeUnit)
        .onChange(async (v) => { this.plugin.settings.preferredImperialVolumeUnit = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Ton type')
      .setDesc('Choose short (US) or metric tonne for "ton" output')
      .addDropdown(drop => drop
        .addOption('short','Short ton (US, 2,000 lb)')
        .addOption('metric','Metric tonne (1,000 kg)')
        .setValue(this.plugin.settings.imperialTonType)
        .onChange(async (v) => { this.plugin.settings.imperialTonType = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Inline hover preview')
      .setDesc('Show converted values on hover in the editor')
      .addToggle(t => t.setValue(this.plugin.settings.inlineHoverEnabled).onChange(async (v) => {
        this.plugin.settings.inlineHoverEnabled = v;
        if (v) enableHover(this.plugin); else disableHover(this.plugin);
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName('Auto-convert on paste')
      .setDesc('If enabled, pasted measurements will be auto-converted to your default target in the active editor')
      .addToggle(t => t.setValue(this.plugin.settings.autoConvertOnPaste).onChange(async (v) => {
        this.plugin.settings.autoConvertOnPaste = v; await this.plugin.saveSettings();
        if (this.plugin && this.plugin.pasteHandler) {
          try { document.removeEventListener('paste', this.plugin.pasteHandler, true); } catch(e){}
          if (v) document.addEventListener('paste', this.plugin.pasteHandler, true);
        }
      }));

    // rest of settings omitted here for brevity; the main file still controls defaults and behavior
  }
}
