import { BingMapsTransitionType } from "../infrastructure/runtime/BingMapsTransition.js";

export type BingMapsLaunchReport = {
  reportId: string;
  provider?: string;
  createdAt?: string;
  state: "BING_MAPS_READY" | "FAILED";
  clickAttempted: boolean;
  clickCount?: 1;
  transitionType?: BingMapsTransitionType;
  popupUrl?: string;
  url?: string;
  title?: string;
  screenshotPath?: string;
  sanitizedDomPath?: string;
  tabs?: Record<string, unknown>;
  failureReason?: string;
  reportPath?: string;
};
