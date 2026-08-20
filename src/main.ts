import { Plugin, Modal, Notice, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import { parseNumberUnit, convertOnce, detectSystemFromText } from './convert';
import { enableHover, disableHover } from './hover';
import { PromptModal, ImperialMetricSettingTab } from './ui';
import { registerCommands } from './commands';

interface ImperialMetricSettings {
  defaultTarget: 'metric'|'imperial';
  decimals: number;
  hoverDecimals: number;
  preferredMetricLengthUnit: 'auto'|'mm'|'cm'|'m'|'km'|'m+cm';
  preferredImperialLengthUnit: 'auto'|'in'|'ft'|'yd'|'mi';
  preferredImperialMassUnit: 'auto'|'oz'|'lb'|'st'|'ton';
  preferredImperialVolumeUnit: 'auto'|'cup'|'pt'|'gal';
  imperialTonType: 'short'|'metric';
  inlineHoverEnabled: boolean;
  autoConvertOnPaste: boolean;
}

const DEFAULT_SETTINGS: ImperialMetricSettings = {
  defaultTarget: 'imperial',
  decimals: 2,
  hoverDecimals: 2,
  preferredMetricLengthUnit: 'auto',
  preferredImperialLengthUnit: 'ft',
  preferredImperialMassUnit: 'auto',
  preferredImperialVolumeUnit: 'auto',
  imperialTonType: 'short',
  inlineHoverEnabled: false,
  autoConvertOnPaste: false,
};

export default class ImperialMetricPlugin extends Plugin {
  settings: ImperialMetricSettings;
  inlineHoverEnabled: boolean;
  tooltipEl: HTMLElement | null;
  hoverHandler: any;
  pasteHandler: any;
  lastHoverAt: number;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.inlineHoverEnabled = !!this.settings.inlineHoverEnabled;
    this.tooltipEl = null;
    this.hoverHandler = null;
    this.pasteHandler = null;
    this.lastHoverAt = 0;
    if (this.inlineHoverEnabled) enableHover(this);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  convertText(text: string, toSystem: 'metric'|'imperial', decimals?: number){
    const dec = typeof decimals === 'number' ? decimals : this.settings.decimals;
    return convertOnce(text, toSystem, dec, this.settings.preferredMetricLengthUnit, this.settings.preferredImperialLengthUnit, this.settings.preferredImperialMassUnit, this.settings.preferredImperialVolumeUnit, this.settings.imperialTonType);
  }

  async onload() {
    await this.loadSettings();
    registerCommands(this);
    this.addSettingTab(new ImperialMetricSettingTab(this.app, this));
  }

  onunload() {
    disableHover(this);
    if (this.pasteHandler) document.removeEventListener('paste', this.pasteHandler);
  }
}
