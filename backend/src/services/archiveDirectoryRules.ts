/**
 * Filesystem-managed directories that may appear inside an archive on NAS,
 * Windows, or macOS volumes but are not user media folders.
 *
 * Keep this rule shared by every scanner that interprets directory names as
 * archive content so platform metadata never becomes a character/category.
 */
const ignoredArchiveDirectoryNames = new Set([
  '@eadir',
  '@tmp',
  '@sharesnap',
  '@synologydrive',
  '#recycle',
  '@recycle',
  '$recycle.bin',
  'system volume information',
])

export function isIgnoredArchiveDirectory(folderName: string) {
  const normalized = folderName.trim().toLocaleLowerCase()

  return (
    !normalized ||
    normalized.startsWith('.') ||
    ignoredArchiveDirectoryNames.has(normalized)
  )
}
