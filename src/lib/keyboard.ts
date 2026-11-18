/**
 * PanelForge Studio Keyboard Utilities · Google Modern Web Guidance Compliant
 * Safeguards keyboard interactions across all input methods (Telex, VNI, CJK, etc.)
 */

/**
 * Checks if a keyboard event is occurring while an Input Method Editor (IME) is actively composing text.
 * When typing with Vietnamese Telex/VNI or CJK input methods, pressing Enter confirms the composition candidate.
 * Without this check, Enter will trigger premature submission of partial/fragmented words.
 *
 * @param event React KeyboardEvent or native KeyboardEvent
 * @returns true if IME composition is active or browser reported keyCode 229
 */
export function isImeComposing(event: React.KeyboardEvent | KeyboardEvent): boolean {
  // Check nativeEvent.isComposing if available (React SyntheticEvent)
  if ('nativeEvent' in event && (event.nativeEvent as any)?.isComposing) {
    return true;
  }
  // Check direct isComposing property
  if ((event as any).isComposing) {
    return true;
  }
  // Check keyCode 229 fallback (VK_PROCESSKEY in Safari & legacy WebKit)
  if ((event as any).keyCode === 229) {
    return true;
  }
  return false;
}
