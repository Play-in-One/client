/** Whether a click on an offer row should open its store, at any screen size.
 *  Links (the store page, game covers), buttons and form controls inside the
 *  row keep their own action, and selecting the row's text opens nothing. */
export function isRowOpenClick(target: EventTarget | null): boolean {
    if ((target as HTMLElement | null)?.closest('a, button, [role="button"], input, select, textarea, label')) return false;
    return !window.getSelection()?.toString();
}
