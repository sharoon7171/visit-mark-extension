import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { POPUP_PORT_NAME } from "@/background/popupStorageSyncChannel";
import { ColorSetting } from "@/components/ColorSetting";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SettingToggle } from "@/components/SettingToggle";
import {
  clearHostSiteSettings,
  hostSiteSettingsAreDefaults,
  loadHostSiteSettingsModel,
  persistHostSiteSettings,
  type HostSiteSettings,
  type PopupSyncFlushPayload,
} from "@/extension-host-settings";
import {
  type ExtensionSyncedOptions,
  EXTENSION_SYNC_OPTION_KEYS,
  extensionOptionsAreDefaults,
  loadExtensionSyncedOptions,
  persistExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
} from "@/extension-options-sync";
import { requestVisitmarkHighlightRefresh } from "@/lib/highlightRefreshMessage";

import { popupShell, popupStack } from "../../ui-classes/popup-layout";
import {
  settingsCardBody,
  settingsCardGlobal,
  settingsCardHead,
  settingsCardSubhead,
  settingsCardScopeBadge,
  settingsCardScopeBadgeMuted,
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
  initialHostPersisted: boolean;
  initialHostSettings: HostSiteSettings;
  initialHostname: string | null;
  initialSyncedOptions: ExtensionSyncedOptions;
};

export function App({
  initialHostPersisted,
  initialHostSettings,
  initialHostname,
  initialSyncedOptions,
}: AppProps) {
  const [masterEnabled, setMasterEnabled] = useState(
    initialSyncedOptions.masterEnabled,
  );
  const [defaultHighlightColor, setDefaultHighlightColor] = useState(
    initialSyncedOptions.defaultHighlightColor,
  );
  const [highlightVisitedCssEnabled, setHighlightVisitedCssEnabled] = useState(
    initialSyncedOptions.highlightVisitedCssEnabled,
  );
  const [highlightHistoryLinksEnabled, setHighlightHistoryLinksEnabled] =
    useState(initialSyncedOptions.highlightHistoryLinksEnabled);
  const [hostSettings, setHostSettings] = useState(initialHostSettings);
  const [hostPersisted, setHostPersisted] = useState(initialHostPersisted);

  const defaultColorRef = useRef(initialSyncedOptions.defaultHighlightColor);
  const masterEnabledRef = useRef(initialSyncedOptions.masterEnabled);
  const highlightVisitedCssRef = useRef(
    initialSyncedOptions.highlightVisitedCssEnabled,
  );
  const highlightHistoryLinksRef = useRef(
    initialSyncedOptions.highlightHistoryLinksEnabled,
  );
  const hostSettingsRef = useRef(initialHostSettings);
  const initialGlobalRef = useRef<ExtensionSyncedOptions>({
    defaultHighlightColor: initialSyncedOptions.defaultHighlightColor,
    highlightHistoryLinksEnabled:
      initialSyncedOptions.highlightHistoryLinksEnabled,
    highlightVisitedCssEnabled: initialSyncedOptions.highlightVisitedCssEnabled,
    masterEnabled: initialSyncedOptions.masterEnabled,
  });
  const initialHostRef = useRef<HostSiteSettings>({
    siteColorsEnabled: initialHostSettings.siteColorsEnabled,
    customHighlightEnabled: initialHostSettings.customHighlightEnabled,
    highlightColor: initialHostSettings.highlightColor,
  });

  defaultColorRef.current = defaultHighlightColor;
  masterEnabledRef.current = masterEnabled;
  highlightVisitedCssRef.current = highlightVisitedCssEnabled;
  highlightHistoryLinksRef.current = highlightHistoryLinksEnabled;
  hostSettingsRef.current = hostSettings;

  const pushSyncedToStorage = () => {
    void persistExtensionSyncedOptions({
      defaultHighlightColor: defaultColorRef.current,
      highlightHistoryLinksEnabled: highlightHistoryLinksRef.current,
      highlightVisitedCssEnabled: highlightVisitedCssRef.current,
      masterEnabled: masterEnabledRef.current,
    });
  };

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
      initialGlobal: { ...initialGlobalRef.current },
      currentGlobal: {
        defaultHighlightColor: defaultColorRef.current,
        highlightHistoryLinksEnabled: highlightHistoryLinksRef.current,
        highlightVisitedCssEnabled: highlightVisitedCssRef.current,
        masterEnabled: masterEnabledRef.current,
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
      initialGlobalRef.current = { ...next };
      if (changedKeys.includes(EXTENSION_SYNC_OPTION_KEYS.masterEnabled)) {
        setMasterEnabled(next.masterEnabled);
        masterEnabledRef.current = next.masterEnabled;
      }
      if (
        changedKeys.includes(EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor)
      ) {
        setDefaultHighlightColor(next.defaultHighlightColor);
      }
      if (
        changedKeys.includes(
          EXTENSION_SYNC_OPTION_KEYS.highlightVisitedCssEnabled,
        )
      ) {
        setHighlightVisitedCssEnabled(next.highlightVisitedCssEnabled);
        highlightVisitedCssRef.current = next.highlightVisitedCssEnabled;
      }
      if (
        changedKeys.includes(
          EXTENSION_SYNC_OPTION_KEYS.highlightHistoryLinksEnabled,
        )
      ) {
        setHighlightHistoryLinksEnabled(next.highlightHistoryLinksEnabled);
        highlightHistoryLinksRef.current = next.highlightHistoryLinksEnabled;
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
    pushSyncedToStorage();
  };

  const setDefaultHighlightColorPersist = (value: string) => {
    setDefaultHighlightColor(value);
    defaultColorRef.current = value;
    pushSyncedToStorage();
  };

  const setHighlightVisitedCssPersist = (checked: boolean) => {
    setHighlightVisitedCssEnabled(checked);
    highlightVisitedCssRef.current = checked;
    pushSyncedToStorage();
  };

  const setHighlightHistoryLinksPersist = (checked: boolean) => {
    setHighlightHistoryLinksEnabled(checked);
    highlightHistoryLinksRef.current = checked;
    pushSyncedToStorage();
  };

  const setSiteColorsEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => {
      const next = { ...prev, siteColorsEnabled: checked };
      hostSettingsRef.current = next;
      void persistHostSiteSettings(initialHostname, next).then(() => {
        requestVisitmarkHighlightRefresh();
      });
      return next;
    });
  };

  const setCustomHighlightEnabledPersist = (checked: boolean) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => {
      let next: HostSiteSettings;
      if (checked) {
        next = {
          ...prev,
          customHighlightEnabled: true,
          highlightColor: prev.highlightColor ?? defaultColorRef.current,
        };
      } else {
        next = {
          ...prev,
          customHighlightEnabled: false,
        };
      }
      hostSettingsRef.current = next;
      void persistHostSiteSettings(initialHostname, next).then(() => {
        requestVisitmarkHighlightRefresh();
      });
      return next;
    });
  };

  const setSiteHighlightColorPersist = (value: string) => {
    if (!initialHostname) {
      return;
    }
    setHostSettings((prev) => {
      const next = { ...prev, highlightColor: value };
      hostSettingsRef.current = next;
      void persistHostSiteSettings(initialHostname, next).then(() => {
        requestVisitmarkHighlightRefresh();
      });
      return next;
    });
  };

  const resetGlobalDefaults = () => {
    void (async () => {
      await resetExtensionSyncedOptionsToDefaults();
      const next = await loadExtensionSyncedOptions();
      setMasterEnabled(next.masterEnabled);
      setDefaultHighlightColor(next.defaultHighlightColor);
      setHighlightVisitedCssEnabled(next.highlightVisitedCssEnabled);
      setHighlightHistoryLinksEnabled(next.highlightHistoryLinksEnabled);
      defaultColorRef.current = next.defaultHighlightColor;
      masterEnabledRef.current = next.masterEnabled;
      highlightVisitedCssRef.current = next.highlightVisitedCssEnabled;
      highlightHistoryLinksRef.current = next.highlightHistoryLinksEnabled;
      initialGlobalRef.current = { ...next };
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
      requestVisitmarkHighlightRefresh();
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

  const siteMeta = initialHostname ? initialHostname : "No active page";

  const siteDisabled = !initialHostname;
  const siteControlsDisabled = siteDisabled || !masterEnabled;
  const siteCustomColorToggleDisabled =
    siteControlsDisabled || !hostSettings.siteColorsEnabled;

  const showGlobalRestore = !extensionOptionsAreDefaults({
    defaultHighlightColor,
    highlightHistoryLinksEnabled,
    highlightVisitedCssEnabled,
    masterEnabled,
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
            <p className={settingsCardScopeBadge}>Default options</p>
          </div>
          <div className={settingsCardBody}>
            <SettingToggle
              id="global-enabled"
              label="Visited link colors"
              description="Enable to highlight visited links with your colors. Disable to use the browser default on every site."
              checked={masterEnabled}
              onChange={setMasterEnabledPersist}
            />
            <p className={settingsCardSubhead} id="detection-heading">
              Detection
            </p>
            <SettingToggle
              id="global-visited-css"
              label="Browser visited state"
              description="Enable to respect links the browser already marks as visited."
              checked={highlightVisitedCssEnabled}
              onChange={setHighlightVisitedCssPersist}
              disabled={!masterEnabled}
            />
            <SettingToggle
              id="global-history-urls"
              label="Browsing history"
              description="Enable to treat URLs in your history as visited, including when history is synced."
              checked={highlightHistoryLinksEnabled}
              onChange={setHighlightHistoryLinksPersist}
              disabled={!masterEnabled}
            />
            <ColorSetting
              id="global-color"
              label="Default color"
              hint="Used everywhere unless a site sets its own."
              value={defaultHighlightColor}
              onChange={setDefaultHighlightColorPersist}
            />
            {showGlobalRestore ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Restore defaults</p>
                  <p className={toggleDescription}>
                    Reset global colors and detection to their default values.
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
          <div className={settingsCardHead}>
            <h2 className={settingsCardTitle}>This site</h2>
            <p
              className={
                siteDisabled
                  ? settingsCardScopeBadgeMuted
                  : settingsCardScopeBadge
              }
            >
              {siteMeta}
            </p>
          </div>
          <div className={settingsCardBody}>
            <SettingToggle
              id="site-enabled"
              label="This site"
              description="Turn on to style visited links here. Turn off so this extension does not change link colors on this site."
              checked={hostSettings.siteColorsEnabled}
              onChange={setSiteColorsEnabledPersist}
              disabled={siteControlsDisabled}
            />
            <SettingToggle
              id="site-custom-color"
              label="Site-specific color"
              description="Enable to choose a highlight color that applies only to this site."
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
                hint="Overrides the default color on this site only."
                value={hostSettings.highlightColor ?? defaultHighlightColor}
                onChange={setSiteHighlightColorPersist}
              />
            ) : null}
            {showSiteRemove ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Remove site settings</p>
                  <p className={toggleDescription}>
                    Deletes saved options for this site so defaults apply again.
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
