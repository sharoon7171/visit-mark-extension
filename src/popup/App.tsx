import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { POPUP_PORT_NAME } from "@/background/popupStorageSyncChannel";
import { ColorSetting } from "@/components/ColorSetting";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingToggle } from "@/components/SettingToggle";
import {
  clearHostSiteSettings,
  hostSiteSettingsAreDefaults,
  type HostSiteSettings,
  loadHostSiteSettingsModel,
  type PopupSyncFlushPayload,
} from "@/extension-host-settings";
import {
  type ExtensionSyncedOptions,
  extensionOptionsAreDefaults,
  EXTENSION_SYNC_OPTION_KEYS,
  loadExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
} from "@/extension-options-sync";

import { popupShell, popupStack } from "../../ui-classes/popup-layout";
import {
  settingsCardBody,
  settingsCardBodySite,
  settingsCardGlobal,
  settingsCardHead,
  settingsCardHeadSite,
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
  initialHostPersisted: boolean;
};

export function App({
  initialSyncedOptions,
  initialHostname,
  initialHostSettings,
  initialHostPersisted,
}: AppProps) {
  const [masterEnabled, setMasterEnabled] = useState(
    initialSyncedOptions.masterEnabled,
  );
  const [defaultHighlightColor, setDefaultHighlightColor] = useState(
    initialSyncedOptions.defaultHighlightColor,
  );
  const [hostSettings, setHostSettings] = useState(initialHostSettings);
  const [hostPersisted, setHostPersisted] = useState(initialHostPersisted);

  const defaultColorRef = useRef(initialSyncedOptions.defaultHighlightColor);
  const masterEnabledRef = useRef(initialSyncedOptions.masterEnabled);
  const hostSettingsRef = useRef(initialHostSettings);
  const initialGlobalRef = useRef<ExtensionSyncedOptions>({
    masterEnabled: initialSyncedOptions.masterEnabled,
    defaultHighlightColor: initialSyncedOptions.defaultHighlightColor,
  });
  const initialHostRef = useRef<HostSiteSettings>({
    siteColorsEnabled: initialHostSettings.siteColorsEnabled,
    customHighlightEnabled: initialHostSettings.customHighlightEnabled,
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
        customHighlightEnabled: initialHostRef.current.customHighlightEnabled,
        highlightColor: initialHostRef.current.highlightColor,
      },
      currentHost: {
        siteColorsEnabled: hostSettingsRef.current.siteColorsEnabled,
        customHighlightEnabled: hostSettingsRef.current.customHighlightEnabled,
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
      void loadHostSiteSettingsModel(initialHostname).then(
        ({ settings, persisted }) => {
          setHostSettings(settings);
          setHostPersisted(persisted);
          initialHostRef.current = {
            siteColorsEnabled: settings.siteColorsEnabled,
            customHighlightEnabled: settings.customHighlightEnabled,
            highlightColor: settings.highlightColor,
          };
        },
      );
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
      ...prev,
      siteColorsEnabled: checked,
    }));
  };

  const setCustomHighlightEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => {
      if (checked) {
        return {
          ...prev,
          customHighlightEnabled: true,
          highlightColor:
            prev.highlightColor ?? defaultColorRef.current,
        };
      }
      return {
        ...prev,
        customHighlightEnabled: false,
      };
    });
  };

  const setSiteHighlightColorPersist = (value: string) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => ({
      ...prev,
      highlightColor: value,
    }));
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
        const { settings, persisted } =
          await loadHostSiteSettingsModel(initialHostname);
        setHostSettings(settings);
        setHostPersisted(persisted);
        initialHostRef.current = {
          siteColorsEnabled: settings.siteColorsEnabled,
          customHighlightEnabled: settings.customHighlightEnabled,
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
      const { settings, persisted } =
        await loadHostSiteSettingsModel(initialHostname);
      setHostSettings(settings);
      setHostPersisted(persisted);
      initialHostRef.current = {
        siteColorsEnabled: settings.siteColorsEnabled,
        customHighlightEnabled: settings.customHighlightEnabled,
        highlightColor: settings.highlightColor,
      };
    })();
  };

  const siteMeta = initialHostname ? initialHostname : "Not a web page";

  const siteDisabled = !initialHostname;
  const siteControlsDisabled = siteDisabled || !masterEnabled;
  const siteCustomColorToggleDisabled =
    siteControlsDisabled || !hostSettings.siteColorsEnabled;

  const showGlobalRestore =
    !extensionOptionsAreDefaults({
      masterEnabled,
      defaultHighlightColor,
    });
  const showSiteRemove =
    Boolean(initialHostname) &&
    (hostPersisted || !hostSiteSettingsAreDefaults(hostSettings));

  return (
    <div className={popupShell}>
      <Header />
      <div className={popupStack}>
        <section className={settingsCardGlobal}>
          <div className={settingsCardHead}>
            <h2 className={settingsCardTitle}>All sites</h2>
            <p className={settingsCardScopeGlobal}>Default</p>
          </div>
          <div className={settingsCardBody}>
            <SettingToggle
              id="global-enabled"
              label="Extension"
              description="Off: normal visited links everywhere."
              checked={masterEnabled}
              onChange={setMasterEnabledPersist}
            />
            <ColorSetting
              id="global-color"
              label="Visited color"
              hint="Used on every site unless you set one below."
              value={defaultHighlightColor}
              onChange={setDefaultHighlightColorPersist}
            />
            {showGlobalRestore ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Restore defaults</p>
                  <p className={toggleDescription}>
                    Turn the extension on and reset the color.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetGlobalDefaults}
                >
                  Restore
                </button>
              </div>
            ) : null}
          </div>
        </section>
        <section className={settingsCardSite}>
          <div className={settingsCardHeadSite}>
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
          <div className={settingsCardBodySite}>
            <SettingToggle
              id="site-enabled"
              label="Use extension here"
              description="Off: this site keeps normal visited links."
              checked={hostSettings.siteColorsEnabled}
              onChange={setSiteColorsEnabledPersist}
              disabled={siteControlsDisabled}
            />
            <SettingToggle
              id="site-custom-color"
              label="Custom color here"
              description="Pick a color only for this site."
              checked={hostSettings.customHighlightEnabled}
              onChange={setCustomHighlightEnabledPersist}
              disabled={siteCustomColorToggleDisabled}
            />
            {hostSettings.customHighlightEnabled &&
            hostSettings.siteColorsEnabled &&
            !siteControlsDisabled ? (
              <ColorSetting
                id="site-color"
                label="Color for this site"
                hint="Overrides the color above."
                value={
                  hostSettings.highlightColor ?? defaultHighlightColor
                }
                onChange={setSiteHighlightColorPersist}
              />
            ) : null}
            {showSiteRemove ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Forget this site</p>
                  <p className={toggleDescription}>
                    Drop saved settings and use the defaults again.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetThisSiteOnly}
                  disabled={siteControlsDisabled}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
