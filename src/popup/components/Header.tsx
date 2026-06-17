import {
  headerBar,
  headerIconWrap,
  headerLeft,
  headerTagline,
  headerTitle,
  headerTitles,
} from "../../../ui-classes/header";

const HEADER_ICON_PATH = "icons/extension-icon.png";

type HeaderProps = {
  subtitle?: string;
  title: string;
};

export function Header({
  subtitle = "Extension settings",
  title,
}: HeaderProps) {
  const iconSrc = chrome.runtime.getURL(HEADER_ICON_PATH);

  return (
    <header className={headerBar}>
      <div className={headerLeft}>
        <div className={headerIconWrap}>
          <img
            src={iconSrc}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
            decoding="async"
          />
        </div>
        <div className={headerTitles}>
          <h1 className={headerTitle}>{title}</h1>
          <p className={headerTagline}>{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
