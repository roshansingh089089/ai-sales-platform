import { Page } from "playwright";
import { browserEvaluationCallbacks } from "./BrowserEvaluationCallbacks.js";

export type InteractiveControl = {
  tag: string;
  type?: string;
  role?: string;
  accessibleName?: string;
  text?: string;
  placeholder?: string;
  label?: string;
  id?: string;
  name?: string;
  href?: string;
  target?: string;
  dataAttributes: Record<string, string>;
  disabled: boolean;
  visible: boolean;
  locatorCandidates: string[];
};

export type AccessibilityNode = {
  role?: { value?: string };
  name?: { value?: string };
  description?: { value?: string };
  ignored?: boolean;
  childIds?: string[];
};

export class DomInspector {
  async dumpHtml(page: Page): Promise<string> {
    return page.content();
  }

  async querySelectors(page: Page, selector: string): Promise<number> {
    return page.locator(selector).count();
  }

  async findByRole(page: Page, role: Parameters<Page["getByRole"]>[0], name?: string): Promise<number> {
    return page.getByRole(role, name ? { name } : undefined).count();
  }

  async findByText(page: Page, text: string): Promise<number> {
    return page.getByText(text).count();
  }

  async accessibilityTree(page: Page): Promise<AccessibilityNode[]> {
    const session = await page.context().newCDPSession(page);
    try {
      const result = (await session.send("Accessibility.getFullAXTree")) as { nodes?: AccessibilityNode[] };
      return result.nodes ?? [];
    } finally {
      await session.detach();
    }
  }

  async interactiveControls(page: Page): Promise<InteractiveControl[]> {
    const controls = page.locator("button, input, select, textarea, a[href], [role], [contenteditable='true']");
    const count = await controls.count();
    const result: InteractiveControl[] = [];
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      const tag = await control.evaluate(browserEvaluationCallbacks.tagName);
      const type = clean(await control.getAttribute("type"));
      const text = clean((await control.innerText().catch(() => "")) || (await control.textContent()));
      const placeholder = clean(await control.getAttribute("placeholder"));
      const id = clean(await control.getAttribute("id"));
      const name = clean(await control.getAttribute("name"));
      const href = clean(await control.getAttribute("href"));
      const target = clean(await control.getAttribute("target"));
      const dataAttributes = Object.fromEntries(
        (
          await Promise.all(
            ["data-testid", "data-test", "data-qa", "data-cy"].map(async (attribute) => [
              attribute,
              clean(await control.getAttribute(attribute)),
            ] as const),
          )
        ).filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
      );
      const label = await associatedLabel(page, id);
      const accessibleName =
        clean(await control.getAttribute("aria-label")) ||
        clean(await control.getAttribute("title")) ||
        label ||
        text ||
        placeholder;
      const role = clean(await control.getAttribute("role")) || implicitRole(tag, type, await control.getAttribute("href"));
      const locatorCandidates: string[] = [];
      if (role && accessibleName) locatorCandidates.push(`getByRole(${JSON.stringify(role)}, { name: ${JSON.stringify(accessibleName)} })`);
      if (label) locatorCandidates.push(`getByLabel(${JSON.stringify(label)})`);
      if (placeholder) locatorCandidates.push(`getByPlaceholder(${JSON.stringify(placeholder)})`);
      if (text) locatorCandidates.push(`getByText(${JSON.stringify(text)})`);
      if (id) locatorCandidates.push(`locator(${JSON.stringify(`[id=${JSON.stringify(id)}]`)})`);
      if (name) locatorCandidates.push(`locator(${JSON.stringify(`[name=${JSON.stringify(name)}]`)})`);
      for (const [attribute, value] of Object.entries(dataAttributes)) {
        locatorCandidates.push(`locator(${JSON.stringify(`[${attribute}=${JSON.stringify(value)}]`)})`);
      }
      result.push({
        tag,
        type,
        role,
        accessibleName,
        text,
        placeholder,
        label,
        id,
        name,
        href,
        target,
        dataAttributes,
        disabled:
          (await control.isDisabled().catch(() => false)) ||
          (await control.getAttribute("aria-disabled")) === "true",
        visible: await control.isVisible().catch(() => false),
        locatorCandidates,
      });
    }
    return result;
  }
}

async function associatedLabel(page: Page, id?: string): Promise<string | undefined> {
  if (!id) return undefined;
  const labels = page.locator("label");
  const count = await labels.count();
  for (let index = 0; index < count; index += 1) {
    const label = labels.nth(index);
    if ((await label.getAttribute("for")) === id) return clean((await label.innerText().catch(() => "")) || (await label.textContent()));
  }
  return undefined;
}

function implicitRole(tag: string, type?: string, href?: string | null): string | undefined {
  if (tag === "button") return "button";
  if (tag === "a" && href) return "link";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (tag !== "input") return undefined;
  if (["button", "submit", "reset"].includes(type ?? "text")) return "button";
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio";
  return "textbox";
}

function clean(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}
