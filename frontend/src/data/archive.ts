export type ArchiveCatalogItem = {
  id: number
  canonicalName: string
  character: string | null
  category: string
  subcategory: string | null
  releaseDate: string | null
  rarity: number | null
  position: string | null
  attribute: string | null
  source: string | null
  imageUrl: string | null
  sourceName: string | null
  sourceUrl: string | null
  memoryText: string | null
  memoryTextSourceUrl: string | null
}


export type ArchiveItem = {
  title: string
  character: string
  category: string
  fileName: string
  filePath: string
  relativePath: string

  mediaType:
    | 'video'
    | 'audio'
    | 'image'
    | 'other'

  sortOrder:
    number | null

  releaseDate:
    string | null

  thumbnailPath:
    string | null

  image?:
    string

  catalogMatched?:
    boolean

  catalogItems?:
    ArchiveCatalogItem[]

  linkedMemories?:
    ArchiveCatalogItem[]

  rarity?:
    number | null

  position?:
    string | null

  attribute?:
    string | null

  source?:
    string | null

  imageUrl?:
    string | null

  memoryText?:
    string | null

  memoryTextSourceUrl?:
    string | null
}