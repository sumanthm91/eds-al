/**
 * function to convert title case to kebab case
 * @param {} text
 */
export default function toKebabCase(text) {
  return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}
