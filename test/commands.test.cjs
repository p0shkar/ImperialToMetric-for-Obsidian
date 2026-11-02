const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const { buildSync } = require('esbuild');

const notices = [];

class MockSetting {
  constructor(container) {
    this.container = container;
    container.settings.push(this);
  }

  setName(name) { this.name = name; return this; }
  setDesc(description) { this.description = description; return this; }
  addToggle(callback) { callback(control()); return this; }
  addDropdown(callback) { callback(control()); return this; }
  addText(callback) { callback(control()); return this; }
  addColorPicker(callback) { callback(control()); return this; }
  addButton(callback) { callback(control()); return this; }
}

function control() {
  return {
    inputEl: { setCustomValidity() {} },
    addOption() { return this; },
    setValue() { return this; },
    setPlaceholder() { return this; },
    setButtonText() { return this; },
    setTooltip() { return this; },
    onChange() { return this; },
    onClick() { return this; },
  };
}

class MockPluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = {
      settings: [],
      empty() { this.settings = []; },
      createEl(tag, options = {}) {
        return {
          tagName: tag,
          textContent: options.text ?? '',
          setText(text) { this.textContent = text; },
        };
      },
    };
  }
}

function loadTypeScript(entryPoint) {
  const filename = path.resolve(__dirname, entryPoint);
  const { outputFiles } = buildSync({
    entryPoints: [filename],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['obsidian'],
    write: false,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));

  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'obsidian') {
      return {
        Modal: class {},
        MarkdownView: class {},
        Notice: class { constructor(message) { notices.push(message); } },
        PluginSettingTab: MockPluginSettingTab,
        Setting: MockSetting,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(outputFiles[0].text, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

const commands = loadTypeScript('../src/commands.ts');
const { ImperialMetricSettingTab } = loadTypeScript('../src/ui.ts');
const converter = loadTypeScript('../src/convert.ts');

function createDocument() {
  const listeners = new Map();
  return {
    activeElement: {},
    addEventListener(type, handler, capture) {
      listeners.set(type, { handler, capture });
    },
    removeEventListener(type, handler, capture) {
      const current = listeners.get(type);
      if (current?.handler === handler && current.capture === capture) listeners.delete(type);
    },
    dispatch(type, event) {
      listeners.get(type)?.handler(event);
    },
    hasListener(type) {
      return listeners.has(type);
    },
  };
}

function createPlugin(overrides = {}) {
  const registeredCommands = new Map();
  const plugin = {
    settings: {
      defaultTarget: 'imperial',
      autoConvertOnPaste: false,
      pasteOutputMode: 'original-and-converted',
      inlineHoverEnabled: false,
    },
    manifest: { name: 'Imperial to Metric Converter' },
    inlineHoverEnabled: false,
    app: {
      workspace: {
        on() { return {}; },
        getActiveViewOfType() { return plugin.activeView; },
      },
    },
    addCommand(command) {
      registeredCommands.set(command.id, command);
      return command;
    },
    registerEvent() {},
    async saveSettings() { plugin.saveCount++; },
    updatePasteStatus() { plugin.statusUpdateCount++; },
    saveCount: 0,
    statusUpdateCount: 0,
    convertText(text, target) {
      return converter.convertOnce(text, target, 2);
    },
    ...overrides,
  };
  plugin.registeredCommands = registeredCommands;
  return plugin;
}

function createPasteEvent(text) {
  return {
    clipboardData: { getData: () => text },
    prevented: false,
    immediateStopped: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.immediateStopped = true; },
    stopPropagation() { this.stopped = true; },
  };
}

test('paste handler converts into both configured output formats', () => {
  const originalDocument = global.document;
  const document = createDocument();
  global.document = document;
  try {
    for (const [mode, expected] of [
      ['original-and-converted', '12 ft (3.66 m)'],
      ['converted-only', '3.66 m'],
    ]) {
      const plugin = createPlugin();
      plugin.settings.autoConvertOnPaste = true;
      plugin.settings.pasteOutputMode = mode;
      const replacements = [];
      plugin.activeView = {
        editor: { replaceSelection: value => replacements.push(value) },
        containerEl: { contains: element => element === document.activeElement },
      };
      commands.bindPasteHandler(plugin);
      const event = createPasteEvent('12 ft');
      document.dispatch('paste', event);

      assert.deepEqual(replacements, [expected]);
      assert.equal(event.prevented, true);
      assert.equal(event.immediateStopped, true);
      assert.equal(event.stopped, true);
      commands.unbindPasteHandler(plugin);
    }
  } finally {
    global.document = originalDocument;
  }
});

test('paste handler leaves unrelated text and inactive editors to normal paste', () => {
  const originalDocument = global.document;
  const document = createDocument();
  global.document = document;
  try {
    const plugin = createPlugin();
    plugin.settings.autoConvertOnPaste = true;
    const replacements = [];
    plugin.activeView = {
      editor: { replaceSelection: value => replacements.push(value) },
      containerEl: { contains: () => false },
    };
    commands.bindPasteHandler(plugin);

    const unrelated = createPasteEvent('hello world');
    document.dispatch('paste', unrelated);
    assert.equal(unrelated.prevented, false);

    const inactiveEditor = createPasteEvent('12 ft');
    document.dispatch('paste', inactiveEditor);
    assert.equal(inactiveEditor.prevented, false);
    assert.deepEqual(replacements, []);
    commands.unbindPasteHandler(plugin);
  } finally {
    global.document = originalDocument;
  }
});

test('paste output format command toggles the format, enables conversion, and saves', async () => {
  const originalDocument = global.document;
  const document = createDocument();
  global.document = document;
  notices.length = 0;
  try {
    const plugin = createPlugin();
    commands.registerCommands(plugin);
    const toggle = plugin.registeredCommands.get('toggle-paste-output-format');

    await toggle.callback();
    assert.equal(plugin.settings.pasteOutputMode, 'converted-only');
    assert.equal(plugin.settings.autoConvertOnPaste, true);
    assert.equal(document.hasListener('paste'), true);
    assert.equal(plugin.saveCount, 1);
    assert.equal(toggle.name.includes('current: Converted only'), true);
    assert.equal(notices.at(-1), 'Auto-convert on paste enabled. Output format: Converted only.');

    await toggle.callback();
    assert.equal(plugin.settings.pasteOutputMode, 'original-and-converted');
    assert.equal(plugin.saveCount, 2);
    assert.equal(toggle.name.includes('current: Original + converted'), true);
    commands.unbindPasteHandler(plugin);
  } finally {
    global.document = originalDocument;
  }
});

test('auto-convert command enables and disables the paste listener', async () => {
  const originalDocument = global.document;
  const document = createDocument();
  global.document = document;
  notices.length = 0;
  try {
    const plugin = createPlugin();
    commands.registerCommands(plugin);
    const toggle = plugin.registeredCommands.get('toggle-auto-convert-on-paste');

    await toggle.callback();
    assert.equal(plugin.settings.autoConvertOnPaste, true);
    assert.equal(document.hasListener('paste'), true);
    assert.equal(plugin.saveCount, 1);
    assert.equal(toggle.name, 'Imperial to Metric Converter: Disable auto-convert on paste');

    await toggle.callback();
    assert.equal(plugin.settings.autoConvertOnPaste, false);
    assert.equal(document.hasListener('paste'), false);
    assert.equal(plugin.pasteHandler, null);
    assert.equal(plugin.saveCount, 2);
    assert.equal(toggle.name, 'Imperial to Metric Converter: Enable auto-convert on paste');
    assert.equal(notices.at(-1), 'Auto-convert on paste disabled.');
  } finally {
    global.document = originalDocument;
  }
});

test('registered commands expose expected names and default hotkeys', () => {
  const plugin = createPlugin();
  commands.registerCommands(plugin);

  const byId = plugin.registeredCommands;
  const expectedHotkeys = [
    ['toggle-inline-previews', ['Mod', 'Shift'], 'H'],
    ['toggle-auto-convert-on-paste', ['Mod', 'Shift'], 'P'],
    ['toggle-paste-output-format', ['Mod', 'Shift'], 'O'],
    ['convert-selection', ['Mod', 'Shift'], 'M'],
    ['convert-selection-original-with-conversion', ['Mod', 'Alt', 'Shift'], 'M'],
  ];
  for (const [id, modifiers, key] of expectedHotkeys) {
    assert.deepEqual(byId.get(id).hotkeys[0], { modifiers, key });
  }
  assert.equal(byId.get('convert-selection-original-with-conversion').name, 'Convert selection (original + converted)');
  assert.equal(byId.has('paste-original-and-converted'), false);
  assert.equal(byId.has('paste-converted-only'), false);
});

test('each settings description places its default hotkey after a line break', () => {
  const originalDocument = global.document;
  global.document = {
    createDocumentFragment() {
      return {
        nodes: [],
        append(node) { this.nodes.push(node); },
      };
    },
    createElement(tagName) { return { tagName }; },
  };
  try {
    const tab = new ImperialMetricSettingTab({}, {
      settings: {
        inlineHoverEnabled: false,
        autoConvertOnPaste: false,
        pasteOutputMode: 'original-and-converted',
        customLiquidMeasureFactors: {},
      },
      saveSettings: async () => {},
      updateToggleCommandNames() {},
    });
    tab.display();

    const descriptions = tab.containerEl.settings
      .filter(setting => setting.description?.nodes)
      .map(setting => ({ name: setting.name, nodes: setting.description.nodes }));
    assert.equal(descriptions.length, 3);
    for (const { nodes } of descriptions) {
      const hotkeyIndex = nodes.findIndex(node => typeof node === 'string' && node.startsWith('Default hotkey:'));
      assert.ok(hotkeyIndex > 0);
      assert.equal(nodes[hotkeyIndex - 1].tagName, 'br');
    }
  } finally {
    global.document = originalDocument;
  }
});
