import { installHighlighting } from "@/highlight/install";
import { installReviewInstallTracking } from "@/preferences/review-prompt-local";
import { installPopupSyncChannel } from "./popup-sync-channel";

installReviewInstallTracking();
installPopupSyncChannel();
installHighlighting();
