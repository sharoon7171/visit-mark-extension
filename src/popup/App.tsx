import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { requestVisitmarkHighlightRefresh } from "@/highlight/refresh-message";
import {
  clearHostSiteSettings,
  hostSiteSettingsAreDefaults,
  loadHostSiteSettingsModel,
  persistHostSiteSettings,
  type HostSiteSettings,
  type PopupSyncFlushPayload,
} from "@/preferences/host-site-settings";
import { POPUP_PORT_NAME } from "@/preferences/popup-sync-port";
import {
  EXTENSION_SYNC_OPTION_KEYS,
  extensionOptionsAreDefaults,
  loadExtensionSyncedOptions,
  persistExtensionSyncedOptions,
  resetExtensionSyncedOptionsToDefaults,
  subscribeExtensionSyncedOptions,
  type ExtensionSyncedOptions,
} from "@/preferences/synced-options";
import { ColorSetting } from "@/popup/components/ColorSetting";
import { Footer } from "@/popup/components/Footer";
import { Header } from "@/popup/components/Header";
import { ReviewPrompt } from "@/popup/components/ReviewPrompt";
import { SettingsSection } from "@/popup/components/SettingsSection";
import { Toggle } from "@/popup/components/Toggle";

import { buttonSecondary } from "../../ui-classes/control";
import {
  appShell,
  popupMainStack,
  settingRow,
} from "../../ui-classes/layout";

type AppProps = {
  initialHostSettings: HostSiteSettings;
  initialHostname: string | null;
  initialShowReviewPrompt: boolean;
  initialSyncedOptions: ExtensionSyncedOptions;
};

export function App({
  initialHostSettings,
  initialHostname,
  initialShowReviewPrompt,
  initialSyncedOptions,
}: AppProps) {
  const [reviewPromptOpen, setReviewPromptOpen] = useState(
    initialShowReviewPrompt,
  );
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

  const globalDisabled = !masterEnabled;
  const siteControlsDisabled = !initialHostname || globalDisabled;
  const siteCustomColorDisabled =
    siteControlsDisabled || !hostSettings.siteColorsEnabled;
  const statusCaption = masterEnabled
    ? "Active and highlighting visited links"
    : "Disabled";

  const showGlobalRestore = !extensionOptionsAreDefaults({
    defaultHighlightColor,
    highlightHistoryLinksEnabled,
    highlightVisitedCssEnabled,
    masterEnabled,
  });
  const showSiteRemove =
    Boolean(initialHostname) && !hostSiteSettingsAreDefaults(hostSettings);

  return (
    <div className={appShell}>
      <Header title="VisitMark" subtitle="Visited link colors" />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className={popupMainStack}>
          {reviewPromptOpen ? (
            <ReviewPrompt onDismiss={() => setReviewPromptOpen(false)} />
          ) : null}
          <SettingsSection description={statusCaption} title="Extension">
            <Toggle
              id="global-enabled"
              label="Enable VisitMark"
              description="Highlight visited links across the web"
              checked={masterEnabled}
              onChange={setMasterEnabledPersist}
              className={settingRow}
            />
          </SettingsSection>
          {initialHostname ? (
            <SettingsSection description={initialHostname} title="This site">
              <Toggle
                id="site-enabled"
                label="Use on this site"
                description="Off keeps this site's normal link colors"
                checked={hostSettings.siteColorsEnabled}
                onChange={setSiteColorsEnabledPersist}
                disabled={siteControlsDisabled}
                className={settingRow}
              />
              {!siteControlsDisabled && hostSettings.siteColorsEnabled ? (
                <>
                  <Toggle
                    id="site-custom-color"
                    label="Custom highlight color"
                    description="Override your default color on this site"
                    checked={hostSettings.customHighlightEnabled}
                    onChange={setCustomHighlightEnabledPersist}
                    disabled={siteCustomColorDisabled}
                    className={settingRow}
                  />
                  {hostSettings.customHighlightEnabled ? (
                    <div className={settingRow}>
                      <ColorSetting
                        id="site-color"
                        label="Site color"
                        value={
                          hostSettings.highlightColor ?? defaultHighlightColor
                        }
                        onChange={setSiteHighlightColorPersist}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
              {showSiteRemove ? (
                <div className={settingRow}>
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={resetThisSiteOnly}
                    disabled={siteControlsDisabled}
                  >
                    Reset site settings
                  </button>
                </div>
              ) : null}
            </SettingsSection>
          ) : null}
          <SettingsSection title="Default color">
            <div className={settingRow}>
              <ColorSetting
                id="global-color"
                label="Highlight color"
                value={defaultHighlightColor}
                onChange={setDefaultHighlightColorPersist}
                disabled={globalDisabled}
              />
            </div>
          </SettingsSection>
          <SettingsSection
            description="Choose what counts as visited"
            title="Detection"
          >
            <Toggle
              id="global-visited-css"
              label="Clicked links"
              description="Links Chrome already marks as visited"
              checked={highlightVisitedCssEnabled}
              onChange={setHighlightVisitedCssPersist}
              disabled={globalDisabled}
              className={settingRow}
            />
            <Toggle
              id="global-history-urls"
              label="History matches"
              description="URLs found in your browsing history"
              checked={highlightHistoryLinksEnabled}
              onChange={setHighlightHistoryLinksPersist}
              disabled={globalDisabled}
              className={settingRow}
            />
          </SettingsSection>
          {showGlobalRestore ? (
            <button
              type="button"
              className={buttonSecondary}
              onClick={resetGlobalDefaults}
            >
              Reset all settings
            </button>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
