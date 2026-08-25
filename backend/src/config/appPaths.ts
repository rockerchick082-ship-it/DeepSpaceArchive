import path from 'node:path'


function configuredDirectory(
  environmentName: string,
  fallbackDirectory: string
) {

  const configured =
    process.env[
      environmentName
    ]
      ?.trim()


  if (
    configured
  ) {

    return path.resolve(
      configured
    )

  }


  return path.resolve(
    process.cwd(),
    fallbackDirectory
  )

}


export const applicationRoot =
  path.resolve(
    process.cwd()
  )


export const dataDirectory =
  configuredDirectory(
    'DEEPSPACE_ARCHIVE_DATA_DIR',
    'data'
  )


export const cacheDirectory =
  configuredDirectory(
    'DEEPSPACE_ARCHIVE_CACHE_DIR',
    'cache'
  )


export const applicationDatabasePath =
  path.join(
    dataDirectory,
    'deepspace-archive.db'
  )


export const catalogDatabasePath =
  path.join(
    dataDirectory,
    'metadata-catalog.db'
  )


export const thumbnailCacheDirectory =
  path.join(
    cacheDirectory,
    'thumbnails'
  )


export const safetyBackupDirectory =
  path.join(
    dataDirectory,
    'safety-backups'
  )


export const restoreUploadDirectory =
  path.join(
    dataDirectory,
    'restore-uploads'
  )
