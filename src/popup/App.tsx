import { useEffect, useRef, useState } from "react";
import { ColorSetting } from "@/components/ColorSetting";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingToggle } from "@/components/SettingToggle";
import {
  type ExtensionSyncedOptions,
  EXTENSION_SYNC_OPTION_KEYS,
  loadExtensionSyncedOptions,
  persistExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
} from "@/extension-options-sync";
import {
  type HostSiteSettings,
  clearHostSiteSettings,
  loadHostSiteSettings,
  persistHostSiteSettings,
} from "@/extension-host-settings";
import {
  popupMainScroll,
  popupShell,
  popupStack,
} from "../../ui-classes/popup-layout";
import {
  settingsCardBody,
  settingsCardGlobal,
  settingsCardHead,
  settingsCardMeta,
  settingsCardSite,
  settingsCardTitle,
} from "../../ui-classes/settings-card";
import {
  settingsResetButton,
  settingsResetRow,
} from "../../ui-classes/settings-reset";

type AppProps = {
  initialSyncedOptions: ExtensionSyncedOptions;
  initialHostname: string | null;
  initialHostSettings: HostSiteSettings;
};

export function App({
  initialSyncedOptions,
  initialHostname,
  initialHostSettings,
}: AppProps) {
  const [masterEnabled, setMasterEnabled] = useState(
    initialSyncedOptions.masterEnabled,
  );
  const [defaultHighlightColor, setDefaultHighlightColor] = useState(
    initialSyncedOptions.defaultHighlightColor,
  );
  const [hostSettings, setHostSettings] = useState(initialHostSettings);

  const defaultColorRef = useRef(initialSyncedOptions.defaultHighlightColor);
  const persistDefaultColorTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  defaultColorRef.current = defaultHighlightColor;

  useEffect(() => {
    const flushDefaultHighlightColor = () => {
      if (persistDefaultColorTimerRef.current !== null) {
        clearTimeout(persistDefaultColorTimerRef.current);
        persistDefaultColorTimerRef.current = null;
      }
      void persistExtensionSyncedOptions({
        defaultHighlightColor: defaultColorRef.current,
      });
    };
    window.addEventListener("pagehide", flushDefaultHighlightColor);
    return () => {
      window.removeEventListener("pagehide", flushDefaultHighlightColor);
      flushDefaultHighlightColor();
    };
  }, []);

  useEffect(() => {
    return subscribeExtensionSyncedOptions((next, changedKeys) => {
      if (changedKeys.includes(EXTENSION_SYNC_OPTION_KEYS.masterEnabled)) {
        setMasterEnabled(next.masterEnabled);
      }
      if (
        changedKeys.includes(EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor)
      ) {
        setDefaultHighlightColor(next.defaultHighlightColor);
      }
    });
  }, []);

  useEffect(() => {
    if (!initialHostname) {
      return;
    }
    const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area !== "local" || !changes.vl_perHost) {
        return;
      }
      void loadHostSiteSettings(initialHostname).then(setHostSettings);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
    };
  }, [initialHostname]);

  const setMasterEnabledPersist = (checked: boolean) => {
    setMasterEnabled(checked);
    void persistExtensionSyncedOptions({ masterEnabled: checked });
  };

  const setDefaultHighlightColorPersist = (value: string) => {
    setDefaultHighlightColor(value);
    if (persistDefaultColorTimerRef.current !== null) {
      clearTimeout(persistDefaultColorTimerRef.current);
    }
    persistDefaultColorTimerRef.current = setTimeout(() => {
      persistDefaultColorTimerRef.current = null;
      void persistExtensionSyncedOptions({ defaultHighlightColor: value });
    }, 250);
  };

  const setSiteOverrideEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => ({
      overrideEnabled: checked,
      highlightColor: prev.highlightColor,
    }));
    void persistHostSiteSettings(initialHostname, {
      overrideEnabled: checked,
    });
  };

  const setSiteHighlightColorPersist = (value: string) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings({
      overrideEnabled: true,
      highlightColor: value,
    });
    void persistHostSiteSettings(initialHostname, {
      overrideEnabled: true,
      highlightColor: value,
    });
  };

  const resetGlobalDefaults = () => {
    void (async () => {
      await resetExtensionSyncedOptionsToDefaults();
      const next = await loadExtensionSyncedOptions();
      setMasterEnabled(next.masterEnabled);
      setDefaultHighlightColor(next.defaultHighlightColor);
      defaultColorRef.current = next.defaultHighlightColor;
    })();
  };

  const resetThisSiteOnly = () => {
    if (!initialHostname) {
      return;
    }
    void (async () => {
      await clearHostSiteSettings(initialHostname);
      setHostSettings({
        overrideEnabled: false,
        highlightColor: null,
      });
    })();
  };

  const siteMeta = initialHostname
    ? initialHostname
    : "Unavailable on this page";

  const siteDisabled = !initialHostname;

  return (
    <div className={popupShell}>
      <Header />
      <div className={popupMainScroll}>
        <div className={popupStack}>
          <section className={settingsCardGlobal}>
            <div className={settingsCardHead}>
              <h2 className={settingsCardTitle}>Global settings</h2>
              <p className={settingsCardMeta}>All websites</p>
            </div>
            <div className={settingsCardBody}>
              <SettingToggle
                id="global-enabled"
                label="Master enable"
                description="Stored in Chrome sync across your devices."
                checked={masterEnabled}
                onChange={setMasterEnabledPersist}
              />
              <ColorSetting
                id="global-color"
                label="Default color"
                hint="Debounced save to Chrome sync after you change it."
                value={defaultHighlightColor}
                onChange={setDefaultHighlightColorPersist}
              />
              <div className={settingsResetRow}>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetGlobalDefaults}
                >
                  Reset global defaults
                </button>
              </div>
            </div>
          </section>
          <section className={settingsCardSite}>
            <div className={settingsCardHead}>
              <h2 className={settingsCardTitle}>This site</h2>
              <p className={settingsCardMeta}>{siteMeta}</p>
            </div>
            <div className={settingsCardBody}>
              <SettingToggle
                id="site-enabled"
                label="Use site color"
                description="When on, the site color below overrides the default."
                checked={hostSettings.overrideEnabled}
                onChange={setSiteOverrideEnabledPersist}
                disabled={siteDisabled}
              />
              <ColorSetting
                id="site-color"
                label="Site color"
                hint="Choosing a color enables override and saves for this host."
                value={
                  hostSettings.highlightColor ?? defaultHighlightColor
                }
                onChange={setSiteHighlightColorPersist}
                disabled={siteDisabled}
              />
              <div className={settingsResetRow}>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetThisSiteOnly}
                  disabled={siteDisabled}
                >
                  Reset this site only
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
