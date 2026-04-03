import {
  chromeWebStoreReviewsUrl,
  persistReviewNeverAskAgain,
  persistReviewSnooze,
} from "@/preferences/review-prompt-local";

import {
  reviewPromptCopy,
  reviewPromptInner,
  reviewPromptPrimaryButton,
  reviewPromptPrimaryButtonIcon,
  reviewPromptPrimaryButtonLabel,
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

function StarGlyph({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
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
    <section
      className={reviewPromptRoot}
      aria-labelledby="review-prompt-title"
    >
      <div className={reviewPromptInner}>
        <div className={reviewPromptStarRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarGlyph key={i} className={reviewPromptStarSvg} />
          ))}
        </div>
        <h2 className={reviewPromptTitle} id="review-prompt-title">
          Enjoying VisitMark?
        </h2>
        <p className={reviewPromptCopy}>
          Tap below to leave a quick star rating — it helps others find the
          extension.
        </p>
        <button
          type="button"
          className={reviewPromptPrimaryButton}
          onClick={onRate}
        >
          <StarGlyph className={reviewPromptPrimaryButtonIcon} />
          <span className={reviewPromptPrimaryButtonLabel}>
            Rate on Chrome Web Store
          </span>
        </button>
        <div className={reviewPromptSecondaryRow}>
          <button
            type="button"
            className={reviewPromptSecondaryButton}
            onClick={onLater}
          >
            Remind me later
          </button>
          <button
            type="button"
            className={reviewPromptSecondaryButton}
            onClick={onNever}
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
    </section>
  );
}
