import fs from 'node:fs/promises'
import path from 'node:path'


export type ArchiveMetadata = {
  displayTitle?: string
  releaseDate?: string
  sortOrder?: number
  thumbnail?: string
}


function getMetadataPath(
  mediaFilePath: string
) {

  const parsed =
    path.parse(
      mediaFilePath
    )


  return path.join(
    parsed.dir,
    `${parsed.name}.json`
  )

}


export async function readArchiveMetadata(
  mediaFilePath: string
): Promise<ArchiveMetadata> {

  const metadataPath =
    getMetadataPath(
      mediaFilePath
    )


  try {

    const contents =
      await fs.readFile(
        metadataPath,
        'utf8'
      )


    return JSON.parse(
      contents
    ) as ArchiveMetadata

  } catch {

    return {}

  }

}


export async function writeArchiveMetadata(
  mediaFilePath: string,
  metadata: ArchiveMetadata
) {

  const metadataPath =
    getMetadataPath(
      mediaFilePath
    )


  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      metadata,
      null,
      2
    ),
    'utf8'
  )


  return metadataPath

}