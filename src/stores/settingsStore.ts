type Settings = {
  isDarkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  messageDisplay: 'comfortable' | 'compact';
};

class SettingsStore {
  private static instance: SettingsStore;
  private settings: Settings;

  private constructor() {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('app-settings');
    this.settings = savedSettings ? JSON.parse(savedSettings) : {
      isDarkMode: false,
      fontSize: 'medium',
      messageDisplay: 'comfortable',
    };

    // Apply settings on load
    this.applySettings();
  }

  static getInstance(): SettingsStore {
    if (!SettingsStore.instance) {
      SettingsStore.instance = new SettingsStore();
    }
    return SettingsStore.instance;
  }

  private applySettings() {
    // Apply dark mode
    if (this.settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply font size
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }[this.settings.fontSize];
  }

  private saveSettings() {
    localStorage.setItem('app-settings', JSON.stringify(this.settings));
    this.applySettings();
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<Settings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }
}

export const settingsStore = SettingsStore.getInstance();