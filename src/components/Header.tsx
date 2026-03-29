import {
  headerBar,
  headerIconWrap,
  headerLeft,
  headerTagline,
  headerTitle,
  headerTitles,
} from "../../ui-classes/header";

const HEADER_ICON_PATH = "icons/extension-icon.png";

export function Header() {
  const iconSrc = chrome.runtime.getURL(HEADER_ICON_PATH);
  return (
    <header className={headerBar}>
      <div className={headerLeft}>
        <span className={headerIconWrap}>
          <img
            src={iconSrc}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            decoding="async"
          />
        </span>
        <div className={headerTitles}>
          <h1 className={headerTitle}>VisitedLinks</h1>
          <p className={headerTagline}>Visited links</p>
        </div>
      </div>
    </header>
  );
}
