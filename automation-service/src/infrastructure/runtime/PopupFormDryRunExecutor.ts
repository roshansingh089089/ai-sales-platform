import { Page } from "playwright";
import { ProviderDryRunRequest, ProviderDryRunStatus } from "../../application/ProviderDryRun.js";
import { PopupUiInspector, PopupUiState, StableLocatorEvidence } from "./PopupUiInspector.js";

export type PopupFormDryRunResult = {
  status: ProviderDryRunStatus;
  popupState?: PopupUiState;
  submitted: false;
  validation: {
    queryVisible: boolean;
    locationVisible: boolean;
    valuesMatch: boolean;
    searchButtonVisible: boolean;
    searchButtonEnabled: boolean;
  };
  selectedLocatorEvidence: Record<string, StableLocatorEvidence | undefined>;
  failureReason?: string;
};

export class PopupFormDryRunExecutor {
  constructor(private readonly popupUiInspector: PopupUiInspector) {}

  async execute(page: Page, request: ProviderDryRunRequest): Promise<PopupFormDryRunResult> {
    if (request.submit === true) return failed("NOT_IMPLEMENTED", undefined, "Search submission is not implemented");

    const inspection = await this.popupUiInspector.inspectLoadedPage(page);
    if (inspection.state === "BING_MAPS_LAUNCHER_READY") {
      return {
        ...failed(
          "LAUNCH_REQUIRED",
          inspection.state,
          "The MapsLeads popup is a Bing Maps launcher; the search form is not available on popup.html",
        ),
        selectedLocatorEvidence: {
          bingMapsLauncher: inspection.visibleControls.bingMapsLauncher[0]?.selectedLocator,
        },
      };
    }
    if (inspection.state === "LOGIN_REQUIRED") {
      return failed("AUTHENTICATION_REQUIRED", inspection.state, "MapsLeads authentication is required");
    }
    if (inspection.state === "LOADING" || inspection.state === "LOADING_TIMEOUT") {
      return failed("FAILED", inspection.state, "MapsLeads popup has not finished loading");
    }
    return failed(
      inspection.state === "FAILED" ? "FAILED" : "UNSUPPORTED_UI",
      inspection.state,
      inspection.failureReason ?? "The MapsLeads popup is not a supported search-form surface",
    );
  }
}

function failed(
  status: ProviderDryRunStatus,
  popupState: PopupUiState | undefined,
  failureReason: string,
): PopupFormDryRunResult {
  return {
    status,
    popupState,
    submitted: false,
    validation: {
      queryVisible: false,
      locationVisible: false,
      valuesMatch: false,
      searchButtonVisible: false,
      searchButtonEnabled: false,
    },
    selectedLocatorEvidence: {},
    failureReason,
  };
}
