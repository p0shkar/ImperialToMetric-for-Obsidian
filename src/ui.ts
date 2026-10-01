import { Modal, PluginSettingTab, Setting, Notice } from 'obsidian';
import { enableHover, disableHover } from './hover';

export class PromptModal extends Modal {
  onSubmit: (val:string, target:'auto'|'metric'|'imperial')=>void;
  onInsert?: (val:string, target:'auto'|'metric'|'imperial')=>void;
  onInsertWithOriginal?: (val:string, target:'auto'|'metric'|'imperial')=>void;
  onCloseCb?: ()=>void;
  initialTarget: 'auto'|'metric'|'imperial';
  constructor(app: any, onSubmit: (val:string, target:'auto'|'metric'|'imperial')=>void, onInsert?: (val:string, target:'auto'|'metric'|'imperial')=>void, onInsertWithOriginal?: (val:string, target:'auto'|'metric'|'imperial')=>void, onCloseCb?: ()=>void, initialTarget: 'auto'|'metric'|'imperial' = 'auto'){ super(app); this.onSubmit = onSubmit; this.onInsert = onInsert; this.onInsertWithOriginal = onInsertWithOriginal; this.onCloseCb = onCloseCb; this.initialTarget = initialTarget; }
  onOpen(){
    const { contentEl } = this;
    contentEl.createEl('h3', {text: 'Enter measurement to convert, e.g. "12 ft"'});
    const input = contentEl.createEl('input') as HTMLInputElement;
    input.type = 'text'; input.style.width = '100%';
    let target: 'auto'|'metric'|'imperial' = this.initialTarget;
    new Setting(contentEl)
      .setName('Convert to')
      .addDropdown(drop => drop
        .addOption('auto','Auto (opposite detected system)')
        .addOption('metric','Metric')
        .addOption('imperial','Imperial')
        .setValue(target)
        .onChange(value => { target = value as typeof target; })
      );
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter'){
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        this.onSubmit(input.value, target);
        this.close();
      }
    });
    const btn = contentEl.createEl('button', {text:'Convert'});
    btn.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e as any).stopImmediatePropagation?.();
      this.onSubmit(input.value, target);
      this.close();
    });
    if (this.onInsertWithOriginal){
      const insertButton = contentEl.createEl('button', {text:'Insert original + converted'});
      insertButton.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        this.onInsertWithOriginal?.(input.value, target);
        this.close();
      });
    }
    if (this.onInsert){
      const insertConvertedButton = contentEl.createEl('button', {text:'Insert converted'});
      insertConvertedButton.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        this.onInsert?.(input.value, target);
        this.close();
      });
    }
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

    containerEl.createEl('h3', { text: 'Conversion defaults' });
    new Setting(containerEl)
      .setName('Default target system')
      .setDesc('Fallback for Convert Input when Auto is selected and the source system cannot be detected, and for right-click, paste, or hover conversions when detection is unavailable. Clearly recognized units convert to the opposite system.')
      .addDropdown(drop => drop
        .addOption('metric','Metric')
        .addOption('imperial','Imperial')
        .setValue(this.plugin.settings.defaultTarget)
        .onChange(async (v) => { this.plugin.settings.defaultTarget = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Conversion decimal places')
      .setDesc('Number of decimal places to show in converted values (0–6).')
      .addText(text => text
        .setValue(String(this.plugin.settings.decimals))
        .onChange(async (v) => { const n = Math.max(0, Math.min(6, parseInt(v) || 0)); this.plugin.settings.decimals = n; await this.plugin.saveSettings(); })
      );

    containerEl.createEl('h3', { text: 'Preferred output units' });
    new Setting(containerEl)
      .setName('Preferred metric length unit')
      .setDesc('Choose the unit for converted metric lengths, or let the converter choose automatically.')
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
      .setDesc('Choose the unit for converted imperial lengths, or let the converter choose automatically.')
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
      .setDesc('Choose the unit for converted imperial masses, or let the converter choose automatically.')
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
      .setDesc('Choose the unit for converted Imperial liquid volumes, or let the converter choose automatically.')
      .addDropdown(drop => drop
        .addOption('auto','Auto')
        .addOption('cup','Cup')
        .addOption('pt','Pint')
        .addOption('qt','Quart')
        .addOption('gal','Gallon')
        .addOption('fl-oz','Fluid ounce')
        .addOption('gill','Gill')
        .addOption('tbsp','Tablespoon')
        .addOption('tsp','Teaspoon')
        .setValue(this.plugin.settings.preferredImperialVolumeUnit)
        .onChange(async (v) => { this.plugin.settings.preferredImperialVolumeUnit = v as any; await this.plugin.saveSettings(); })
      );

    containerEl.createEl('h3', { text: 'Regional conventions' });
    new Setting(containerEl)
      .setName('Ton convention')
      .setDesc('Choose how an unqualified "ton" is interpreted and which ton is used for Imperial ton output.')
      .addDropdown(drop => drop
        .addOption('short','US customary ton')
        .addOption('metric','Metric tonne')
        .setValue(this.plugin.settings.imperialTonType)
        .onChange(async (v) => { this.plugin.settings.imperialTonType = v as any; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName('Liquid measure convention')
      .setDesc('Fixed factors in ml per unit. UK cup and spoon factors are fixed plugin values and may differ from recipe conventions. Explicit input qualifiers (US, UK, Imperial) override this preference.')
      .addDropdown(drop => drop
        .addOption('us','US customary')
        .addOption('imperial','UK / Imperial')
        .setValue(this.plugin.settings.liquidMeasureType)
        .onChange(async (v) => { this.plugin.settings.liquidMeasureType = v as any; await this.plugin.saveSettings(); })
      );

    containerEl.createEl('h3', { text: 'Hover & preview' });
    new Setting(containerEl)
      .setName('Hover decimal places')
      .setDesc('Number of decimal places to show in hover previews (0–6).')
      .addText(text => text
        .setValue(String(this.plugin.settings.hoverDecimals))
        .onChange(async (v) => { const n = Math.max(0, Math.min(6, parseInt(v) || 0)); this.plugin.settings.hoverDecimals = n; await this.plugin.saveSettings(); })
      );

    let hoverColorPicker: any;
    new Setting(containerEl)
      .setName('Inline hover background color')
      .setDesc('Choose a custom tooltip color, or reset to the Obsidian theme default.')
      .addColorPicker(color => {
        hoverColorPicker = color;
        color
          .setValue(this.plugin.settings.hoverBackgroundColor || '#4c956c')
          .onChange(async value => {
            this.plugin.settings.hoverBackgroundColor = value;
            if (this.plugin.tooltipEl) this.plugin.tooltipEl.style.background = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton(button => button
        .setButtonText('Reset')
        .setTooltip('Use the Obsidian theme default')
        .onClick(async () => {
          this.plugin.settings.hoverBackgroundColor = '';
          if (this.plugin.tooltipEl) this.plugin.tooltipEl.style.background = 'var(--background-modifier-success)';
          hoverColorPicker.setValue('#4c956c');
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Inline hover preview')
      .setDesc('Show a conversion preview only while the pointer is over a recognized measurement in the editor.')
      .addToggle(t => t.setValue(this.plugin.settings.inlineHoverEnabled).onChange(async (v) => {
        this.plugin.settings.inlineHoverEnabled = v;
        if (v) enableHover(this.plugin); else disableHover(this.plugin);
        this.plugin.updateToggleCommandNames?.();
        await this.plugin.saveSettings();
      }));

    containerEl.createEl('h3', { text: 'Paste & input' });
    new Setting(containerEl)
      .setName('Auto-convert on paste')
      .setDesc('When pasted text contains a measurement, insert the converted text using the selected paste output format. The default target is used only when the source system cannot be detected.')
      .addToggle(t => t.setValue(this.plugin.settings.autoConvertOnPaste).onChange(async (v) => {
        this.plugin.settings.autoConvertOnPaste = v;
        if (v) {
          const { bindPasteHandler } = await import('./commands');
          bindPasteHandler?.(this.plugin);
        } else {
          const { unbindPasteHandler } = await import('./commands');
          unbindPasteHandler?.(this.plugin);
        }
        this.plugin.updateToggleCommandNames?.();
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName('Paste output format')
      .setDesc('Current mode: ' + (this.plugin.settings.pasteOutputMode === 'original-and-converted' ? 'Original + converted' : 'Converted only'))
      .addDropdown(drop => drop
        .addOption('original-and-converted', 'Original + converted')
        .addOption('converted-only', 'Converted only')
        .setValue(this.plugin.settings.pasteOutputMode)
        .onChange(async value => {
          this.plugin.settings.pasteOutputMode = value as any;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    // rest of settings omitted here for brevity; the main file still controls defaults and behavior
  }
}
