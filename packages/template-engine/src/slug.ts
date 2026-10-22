/**
 * Folder and package names derived from a project name.
 *
 * The slug is used as the root folder of the generated ZIP and as the npm
 * package name, so it is restricted to lowercase ASCII letters, digits and
 * single hyphens. Names written entirely in other scripts (for example Hindi
 * or Tamil) have no ASCII letters to keep, so the template id is used instead;
 * the original name is still used everywhere it is displayed.
 */

export const SLUG_MAX_LENGTH = 48;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;

export function slugify(input: string, maxLength = SLUG_MAX_LENGTH): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop combining accents: "Ünïcode" -> "Unicode"
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug;
}

/**
 * Returns a safe folder/package name for `projectName`, falling back to
 * `fallback` (normally the template id) when the name has no usable letters.
 */
export function deriveProjectSlug(projectName: string, fallback: string): string {
  let slug = slugify(projectName);
  if (slug.length < 2) slug = slugify(fallback) || 'campuskit-project';
  if (WINDOWS_RESERVED.test(slug)) slug = `${slug}-project`;
  return slug;
}
