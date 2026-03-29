import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { POPUP_PORT_NAME } from "@/background/popupStorageSyncChannel";
import { ColorSetting } from "@/components/ColorSetting";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingToggle } from "@/components/SettingToggle";
import {
  clearHostSiteSettings,
  type HostSiteSettings,
  loadHostSiteSettingsModel,
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
  settingsCardScopeGlobal,
  settingsCardScopeSite,
  settingsCardScopeSiteMuted,
  settingsCardSite,
  settingsCardTitle,
} from "../../ui-classes/settings-card";
import {
  toggleDescription,
  toggleLabel,
} from "../../ui-classes/setting-toggle";
import {
  settingsResetButton,
  settingsResetCopy,
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
    siteColorsEnabled: initialHostSettings.siteColorsEnabled,
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
        siteColorsEnabled: initialHostRef.current.siteColorsEnabled,
        highlightColor: initialHostRef.current.highlightColor,
      },
      currentHost: {
        siteColorsEnabled: hostSettingsRef.current.siteColorsEnabled,
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
        masterEnabledRef.current = next.masterEnabled;
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
      void loadHostSiteSettingsModel(initialHostname).then(({ settings }) => {
        setHostSettings(settings);
        initialHostRef.current = {
          siteColorsEnabled: settings.siteColorsEnabled,
          highlightColor: settings.highlightColor,
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

  const setSiteColorsEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => ({
      siteColorsEnabled: checked,
      highlightColor: prev.highlightColor,
    }));
  };

  const setSiteHighlightColorPersist = (value: string) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings({
      siteColorsEnabled: true,
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
      if (initialHostname) {
        const { settings } = await loadHostSiteSettingsModel(initialHostname);
        setHostSettings(settings);
        initialHostRef.current = {
          siteColorsEnabled: settings.siteColorsEnabled,
          highlightColor: settings.highlightColor,
        };
      }
    })();
  };

  const resetThisSiteOnly = () => {
    if (!initialHostname) {
      return;
    }
    void (async () => {
      await clearHostSiteSettings(initialHostname);
      const { settings } = await loadHostSiteSettingsModel(initialHostname);
      setHostSettings(settings);
      initialHostRef.current = {
        siteColorsEnabled: settings.siteColorsEnabled,
        highlightColor: settings.highlightColor,
      };
    })();
  };

  const siteMeta = initialHostname ? initialHostname : "Not a webpage";

  const siteDisabled = !initialHostname;
  const siteControlsDisabled = siteDisabled || !masterEnabled;
  const siteColorDisabled =
    siteControlsDisabled || !hostSettings.siteColorsEnabled;

  return (
    <div className={popupShell}>
      <Header />
      <div className={popupMainScroll}>
        <div className={popupStack}>
          <section className={settingsCardGlobal}>
            <div className={settingsCardHead}>
              <h2 className={settingsCardTitle}>Global</h2>
              <p className={settingsCardScopeGlobal}>All sites</p>
            </div>
            <div className={settingsCardBody}>
              <SettingToggle
                id="global-enabled"
                label="Enable all sites"
                description="Off stops highlighting on every site."
                checked={masterEnabled}
                onChange={setMasterEnabledPersist}
              />
              <ColorSetting
                id="global-color"
                label="Default color"
                hint="Used when a site does not set its own color."
                value={defaultHighlightColor}
                onChange={setDefaultHighlightColorPersist}
              />
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Reset all</p>
                  <p className={toggleDescription}>
                    Undo global switch and color to built-in defaults.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetGlobalDefaults}
                >
                  Reset all
                </button>
              </div>
            </div>
          </section>
          <section className={settingsCardSite}>
            <div className={settingsCardHead}>
              <h2 className={settingsCardTitle}>This site</h2>
              <p
                className={
                  siteDisabled
                    ? settingsCardScopeSiteMuted
                    : settingsCardScopeSite
                }
              >
                {siteMeta}
              </p>
            </div>
            <div className={settingsCardBody}>
              <SettingToggle
                id="site-enabled"
                label="Enable this site"
                description="Off skips highlighting on this site only."
                checked={hostSettings.siteColorsEnabled}
                onChange={setSiteColorsEnabledPersist}
                disabled={siteControlsDisabled}
              />
              <ColorSetting
                id="site-color"
                label="Site color"
                hint="Starts like the default; change to override this site only."
                value={
                  hostSettings.highlightColor ?? defaultHighlightColor
                }
                onChange={setSiteHighlightColorPersist}
                disabled={siteColorDisabled}
                suppressProgrammaticPickerEcho={
                  hostSettings.highlightColor === null
                }
                programmaticEchoResetKey={defaultHighlightColor}
              />
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Reset site</p>
                  <p className={toggleDescription}>
                    Remove this site&apos;s settings; follow global again.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetThisSiteOnly}
                  disabled={siteControlsDisabled}
                >
                  Reset site
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
