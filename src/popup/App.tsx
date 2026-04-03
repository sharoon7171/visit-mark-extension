import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  EXTENSION_SYNC_OPTION_KEYS,
  extensionOptionsAreDefaults,
  loadExtensionSyncedOptions,
  persistExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
  type ExtensionSyncedOptions,
} from "@/extension-options-sync";
import { requestVisitmarkHighlightRefresh } from "@/lib/highlightRefreshMessage";
import { POPUP_PORT_NAME } from "@/lib/popup-sync-port";

import { popupShell, popupStack } from "../../ui-classes/popup-layout";
import {
  settingsCardBody,
  settingsCardGlobal,
  settingsCardHead,
  settingsCardScopeBadge,
  settingsCardScopeBadgeMuted,
  settingsCardSite,
  settingsCardSubhead,
  settingsCardTitle,
} from "../../ui-classes/settings-card";
import {
  settingsResetButton,
  settingsResetCopy,
  settingsResetRow,
} from "../../ui-classes/settings-reset";
import {
  toggleDescription,
  toggleLabel,
} from "../../ui-classes/setting-toggle";

type AppProps = {
  initialHostSettings: HostSiteSettings;
  initialHostname: string | null;
  initialSyncedOptions: ExtensionSyncedOptions;
};

export function App({
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
    ...initialHostSettings,
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
    }).then(() => {
      requestVisitmarkHighlightRefresh();
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
      initialHost: { ...initialHostRef.current },
      currentHost: { ...hostSettingsRef.current },
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
      void loadHostSiteSettingsModel(initialHostname).then(({ settings }) => {
        setHostSettings(settings);
        initialHostRef.current = { ...settings };
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
    pushSyncedToStorage();
  };

  const setDefaultHighlightColorPersist = (value: string) => {
    setDefaultHighlightColor(value);
    defaultColorRef.current = value;
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
          highlightColor: null,
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
        const { settings } = await loadHostSiteSettingsModel(initialHostname);
        setHostSettings(settings);
        initialHostRef.current = { ...settings };
      }
      requestVisitmarkHighlightRefresh();
    })();
  };

  const resetThisSiteOnly = () => {
    if (!initialHostname) {
      return;
    }
    void (async () => {
      await clearHostSiteSettings(initialHostname);
      requestVisitmarkHighlightRefresh();
      const { settings } = await loadHostSiteSettingsModel(initialHostname);
      setHostSettings(settings);
      initialHostRef.current = { ...settings };
    })();
  };

  const siteMeta = initialHostname ? initialHostname : "No website open";

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
    Boolean(initialHostname) && !hostSiteSettingsAreDefaults(hostSettings);

  return (
    <div className={popupShell}>
      <Header />
      <div className={popupStack}>
        <section className={settingsCardGlobal}>
          <div className={settingsCardHead}>
            <h2 className={settingsCardTitle}>Global</h2>
            <p className={settingsCardScopeBadge}>Default settings</p>
          </div>
          <div className={settingsCardBody}>
            <SettingToggle
              id="global-enabled"
              label="Visited link highlighting"
              description="On: your colors and rules apply everywhere. Off: extension does not inject styles; the page's own CSS applies."
              checked={masterEnabled}
              onChange={setMasterEnabledPersist}
            />
            <p className={settingsCardSubhead} id="detection-heading">
              What counts as visited
            </p>
            <SettingToggle
              id="global-visited-css"
              label="Browser-marked links"
              description="Treat links the browser already shows as visited."
              checked={highlightVisitedCssEnabled}
              onChange={setHighlightVisitedCssPersist}
              disabled={!masterEnabled}
            />
            <SettingToggle
              id="global-history-urls"
              label="Browsing history"
              description="Also treat URLs that appear in your history (including synced history)."
              checked={highlightHistoryLinksEnabled}
              onChange={setHighlightHistoryLinksPersist}
              disabled={!masterEnabled}
            />
            <ColorSetting
              id="global-color"
              label="Default highlight color"
              hint="Used on every site unless you set a site override."
              value={defaultHighlightColor}
              onChange={setDefaultHighlightColorPersist}
            />
            {showGlobalRestore ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Restore defaults</p>
                  <p className={toggleDescription}>
                    Reset all global settings to their original values.
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
            <h2 className={settingsCardTitle}>Current site</h2>
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
              label="Apply styling on this site"
              description="On: use your global rules and colors here. Off: no extension styling on this site."
              checked={hostSettings.siteColorsEnabled}
              onChange={setSiteColorsEnabledPersist}
              disabled={siteControlsDisabled}
            />
            <SettingToggle
              id="site-custom-color"
              label="Site-only highlight color"
              description="Use a color on this site that overrides the global default."
              checked={hostSettings.customHighlightEnabled}
              onChange={setCustomHighlightEnabledPersist}
              disabled={siteCustomColorToggleDisabled}
            />
            {hostSettings.customHighlightEnabled &&
            hostSettings.siteColorsEnabled &&
            !siteControlsDisabled ? (
              <ColorSetting
                id="site-color"
                label="Site highlight color"
                hint="Applies on this site only."
                value={hostSettings.highlightColor ?? defaultHighlightColor}
                onChange={setSiteHighlightColorPersist}
              />
            ) : null}
            {showSiteRemove ? (
              <div className={settingsResetRow}>
                <div className={settingsResetCopy}>
                  <p className={toggleLabel}>Clear site overrides</p>
                  <p className={toggleDescription}>
                    Remove saved settings for this site. Global defaults apply.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsResetButton}
                  onClick={resetThisSiteOnly}
                  disabled={siteControlsDisabled}
                >
                  Clear
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
