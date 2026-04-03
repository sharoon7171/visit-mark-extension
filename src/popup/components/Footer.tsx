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

export function Footer() {
  return (
    <footer className={footerRoot}>
      <div className={footerBar}>
        <div className={footerCreditWrap}>
          <p className={footerCreditLine}>
            By{" "}
            <a
              className={footerCreditLink}
              href={SQ_TECH_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              SQ Tech
            </a>
          </p>
        </div>
        <nav
          className={footerNav}
          aria-label="Feedback and reviews"
        >
          <div className={footerActionGroup}>
            <a
              className={footerActionGroupItem}
              href={chromeWebStoreReviewsUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Leave a review
            </a>
            <span
              className={footerActionGroupRule}
              aria-hidden
            />
            <a
              className={footerActionGroupItem}
              href={ISSUE_FEATURE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Request feature
            </a>
            <span
              className={footerActionGroupRule}
              aria-hidden
            />
            <a
              className={footerActionGroupItem}
              href={ISSUE_BUG_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Report bug
            </a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
