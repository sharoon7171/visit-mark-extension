import {
  chromeWebStoreReviewsUrl,
  persistReviewNeverAskAgain,
  persistReviewSnooze,
} from "@/preferences/review-prompt-local";

import { buttonPrimary } from "../../../ui-classes/control";
import {
  reviewPromptCopy,
  reviewPromptInner,
  reviewPromptRoot,
  reviewPromptSecondaryButton,
  reviewPromptSecondaryRow,
  reviewPromptStarRow,
  reviewPromptStarSvg,
  reviewPromptTitle,
} from "../../../ui-classes/review-prompt";

type ReviewPromptProps = {
  onDismiss: () => void;
};

function StarGlyph() {
  return (
    <svg className={reviewPromptStarSvg} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5z"
      />
    </svg>
  );
}

export function ReviewPrompt({ onDismiss }: ReviewPromptProps) {
  const onRate = () => {
    void chrome.tabs.create({ url: chromeWebStoreReviewsUrl() });
  };

  const onLater = () => {
    void persistReviewSnooze().then(onDismiss);
  };

  const onNever = () => {
    void persistReviewNeverAskAgain().then(onDismiss);
  };

  return (
    <section className={reviewPromptRoot} aria-labelledby="review-title">
      <div className={reviewPromptInner}>
        <div className={reviewPromptStarRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarGlyph key={i} />
          ))}
        </div>
        <h2 className={reviewPromptTitle} id="review-title">
          Enjoying VisitMark?
        </h2>
        <p className={reviewPromptCopy}>
          A quick rating helps others discover the extension.
        </p>
        <button type="button" className={buttonPrimary} onClick={onRate}>
          Rate in Chrome Web Store
        </button>
        <div className={reviewPromptSecondaryRow}>
          <button
            type="button"
            className={reviewPromptSecondaryButton}
            onClick={onLater}
          >
            Later
          </button>
          <button
            type="button"
            className={reviewPromptSecondaryButton}
            onClick={onNever}
          >
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </section>
  );
}
