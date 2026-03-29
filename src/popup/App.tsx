import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { POPUP_PORT_NAME } from "@/background/popupStorageSyncChannel";
import { ColorSetting } from "@/components/ColorSetting";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingToggle } from "@/components/SettingToggle";
import {
  clearHostSiteSettings,
  type HostSiteSettings,
  loadHostSiteSettings,
  type PopupSyncFlushPayload,
} from "@/extension-host-settings";
import {
  type ExtensionSyncedOptions,
  EXTENSION_SYNC_OPTION_KEYS,
  loadExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
} from "@/extension-options-sync";

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
  const masterEnabledRef = useRef(initialSyncedOptions.masterEnabled);
  const hostSettingsRef = useRef(initialHostSettings);
  const initialGlobalRef = useRef<ExtensionSyncedOptions>({
    masterEnabled: initialSyncedOptions.masterEnabled,
    defaultHighlightColor: initialSyncedOptions.defaultHighlightColor,
  });
  const initialHostRef = useRef<HostSiteSettings>({
    overrideEnabled: initialHostSettings.overrideEnabled,
    highlightColor: initialHostSettings.highlightColor,
  });

  defaultColorRef.current = defaultHighlightColor;
  masterEnabledRef.current = masterEnabled;
  hostSettingsRef.current = hostSettings;

  const portRef = useRef<chrome.runtime.Port | null>(null);

  useLayoutEffect(() => {
    const port = chrome.runtime.connect({ name: POPUP_PORT_NAME });
    portRef.current = port;
    return () => {
      port.disconnect();
      portRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const port = portRef.current;
    if (!port) {
      return;
    }
    const payload: PopupSyncFlushPayload = {
      hostname: initialHostname,
      initialGlobal: {
        masterEnabled: initialGlobalRef.current.masterEnabled,
        defaultHighlightColor: initialGlobalRef.current.defaultHighlightColor,
      },
      currentGlobal: {
        masterEnabled: masterEnabledRef.current,
        defaultHighlightColor: defaultColorRef.current,
      },
      initialHost: {
        overrideEnabled: initialHostRef.current.overrideEnabled,
        highlightColor: initialHostRef.current.highlightColor,
      },
      currentHost: {
        overrideEnabled: hostSettingsRef.current.overrideEnabled,
        highlightColor: hostSettingsRef.current.highlightColor,
      },
    };
    port.postMessage({ type: "state", payload });
  });

  useEffect(() => {
    return subscribeExtensionSyncedOptions((next, changedKeys) => {
      initialGlobalRef.current = {
        masterEnabled: next.masterEnabled,
        defaultHighlightColor: next.defaultHighlightColor,
      };
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
      if (area !== "sync" || !changes.vl_perHost) {
        return;
      }
      void loadHostSiteSettings(initialHostname).then((s) => {
        setHostSettings(s);
        initialHostRef.current = {
          overrideEnabled: s.overrideEnabled,
          highlightColor: s.highlightColor,
        };
      });
    };
    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
    };
  }, [initialHostname]);

  const setMasterEnabledPersist = (checked: boolean) => {
    setMasterEnabled(checked);
    masterEnabledRef.current = checked;
  };

  const setDefaultHighlightColorPersist = (value: string) => {
    setDefaultHighlightColor(value);
    defaultColorRef.current = value;
  };

  const setSiteOverrideEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => ({
      overrideEnabled: checked,
      highlightColor: prev.highlightColor,
    }));
  };

  const setSiteHighlightColorPersist = (value: string) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings({
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
      masterEnabledRef.current = next.masterEnabled;
      initialGlobalRef.current = {
        masterEnabled: next.masterEnabled,
        defaultHighlightColor: next.defaultHighlightColor,
      };
    })();
  };

  const resetThisSiteOnly = () => {
    if (!initialHostname) {
      return;
    }
    void (async () => {
      await clearHostSiteSettings(initialHostname);
      const cleared: HostSiteSettings = {
        overrideEnabled: false,
        highlightColor: null,
      };
      setHostSettings(cleared);
      initialHostRef.current = cleared;
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
                description="Chrome sync: saved when this popup closes if it changed."
                checked={masterEnabled}
                onChange={setMasterEnabledPersist}
              />
              <ColorSetting
                id="global-color"
                label="Default color"
                hint="Live preview while open; Chrome sync updates when the popup closes."
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
                description="When on, the site color overrides the default (Chrome sync when the popup closes if changed)."
                checked={hostSettings.overrideEnabled}
                onChange={setSiteOverrideEnabledPersist}
                disabled={siteDisabled}
              />
              <ColorSetting
                id="site-color"
                label="Site color"
                hint="Live preview while open; per-host Chrome sync when the popup closes."
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
