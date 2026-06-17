import type { ReactNode } from "react";

import {
  sectionDetail,
  sectionGroup,
  sectionHeading,
  sectionPanel,
  sectionPanelBody,
} from "../../../ui-classes/layout";

type SettingsSectionProps = {
  children: ReactNode;
  description?: string;
  title: string;
};

export function SettingsSection({
  children,
  description,
  title,
}: SettingsSectionProps) {
  return (
    <section className={sectionGroup}>
      <div>
        <h2 className={sectionHeading}>{title}</h2>
        {description ? (
          <p className={`truncate ${sectionDetail}`} title={description}>
            {description}
          </p>
        ) : null}
      </div>
      <div className={sectionPanel}>
        <div className={sectionPanelBody}>{children}</div>
      </div>
    </section>
  );
}
