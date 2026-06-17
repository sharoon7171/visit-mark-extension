import { chromeWebStoreReviewsUrl } from "@/preferences/review-prompt-local";

import {
  footerActionGroup,
  footerActionGroupItem,
  footerActionGroupRule,
  footerBar,
  footerCreditLine,
  footerCreditLink,
  footerCreditWrap,
  footerNav,
  footerRoot,
} from "../../../ui-classes/footer";

const REPO_URL = "https://github.com/sharoon7171/visit-mark-extension";
const ISSUE_BUG_URL = `${REPO_URL}/issues/new?template=bug_report.yml`;
const ISSUE_FEATURE_URL = `${REPO_URL}/issues/new?template=feature_request.yml`;
const SQ_TECH_URL = "https://www.sqtech.dev/";

const FOOTER_LINKS = [
  { href: chromeWebStoreReviewsUrl(), label: "Rate" },
  { href: ISSUE_FEATURE_URL, label: "Feature" },
  { href: ISSUE_BUG_URL, label: "Bug" },
] as const;

export function Footer() {
  return (
    <footer className={footerRoot}>
      <div className={footerBar}>
        <div className={footerCreditWrap}>
          <p className={footerCreditLine}>
            By{" "}
            <a
              href={SQ_TECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={footerCreditLink}
            >
              SQ Tech
            </a>
          </p>
        </div>
        <nav className={footerNav} aria-label="Extension links">
          <div className={footerActionGroup}>
            {FOOTER_LINKS.map((link, index) => (
              <span key={link.href} className="contents">
                {index > 0 ? <span className={footerActionGroupRule} /> : null}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerActionGroupItem}
                >
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
