export type CatalogItem = {
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
  sourceKey: string | null
  sourceUpdatedAt: string | null
  manualNotes: string | null
  memoryText: string | null
  memoryTextSourceUrl: string | null

  /*
   * Included by the catalog list endpoint for the
   * informational Has File / Missing File badge.
   */
  hasFile?: boolean

  createdAt: string
  updatedAt: string
}


export type CatalogResponse = {
  count: number
  limit: number
  offset: number
  items: CatalogItem[]
}


export type CatalogStats = {
  totalItems: number
  archiveItems: number
  memoryReferenceItems: number
  matchedItems: number
  unmatchedItems: number
  fileMatches: number
  memoryRelationships: number

  categories:
    Array<{
      category: string
      count: number
    }>

  characters:
    Array<{
      character: string
      count: number
    }>
}


export type AutoMatchResult = {
  scannedCatalogItems: number
  scannedLibraryFiles: number
  matched: number
  alreadyMatched: number
  unmatchedCatalogItems: number

  needsReview:
    Array<{
      catalogItemId: number
      catalogName: string
      fileTitle: string
      character: string
      category: string
      relativePath: string
      confidence: number
    }>
}


export type MatchCandidate = {
  catalogItemId: number
  catalogName: string
  fileTitle: string
  character: string
  category: string
  relativePath: string
  confidence: number

  linkedCatalogItems:
    Array<{
      id: number
      canonicalName: string
      rarity: number | null
    }>
}


export type CandidateResponse = {
  catalogItem: CatalogItem
  count: number
  candidates: MatchCandidate[]
}


export type BulkMatchOption = {
  fileTitle: string
  character: string
  category: string
  relativePath: string
  confidence: number
}


export type BulkMatchRow = {
  catalogItemId: number
  catalogName: string
  character: string | null
  category: string
  options: BulkMatchOption[]
}


export type BulkMatchResponse = {
  count: number
  rows: BulkMatchRow[]
}


export type BulkOverrideRow = {
  catalogItemId: number
  itemName: string
  displayName: string
  character: string | null
  category: string
  fileMatchId: number
  currentFileName: string
  relativePath: string
  targetFileName: string
  alreadyNamed: boolean
  eligible: boolean
  reason: string | null
}


export type BulkOverrideResponse = {
  count: number
  eligible: number
  alreadyNamed: number
  rows: BulkOverrideRow[]
}


export type CatalogMemoryLink = {
  id: number
  archiveCatalogItemId: number
  memoryCatalogItemId: number
  relationType: string
  memory: CatalogItem
}


export type CatalogArchiveLink = {
  id: number
  archiveCatalogItemId: number
  memoryCatalogItemId: number
  relationType: string
  archiveItem: CatalogItem
}


export type CatalogRelationshipView = {
  catalogItemId: number
  mode:
    | 'memories'
    | 'archive-links'
  items: CatalogItem[]
}


export type WikiPreviewItem = {
  canonicalName: string
  character: string
  category: string
  rarity: number | null
  attribute: string | null
  position: string | null
  subcategory: string | null
  source: string | null
  imageUrl: string | null
  sourceUrl: string
  sourceKey: string
}


export type WikiPreviewResponse = {
  character: string
  count: number
  items: WikiPreviewItem[]
}


export type WikiSyncResult = {
  character: string
  sourceUrl: string
  fetchedAt: string
  discovered: number
  created: number
  updated: number
  skipped: number
}



export type SupplementalSyncResult = {
  character: string
  fetchedAt: string

  fallingForYou: {
    discovered: number
    created: number
    enriched: number
    existing: number
    skipped: number
  }

  byYourSide: {
    discovered: number
    created: number
    existingMemory: number
    existingSupplemental: number
    skipped: number
    linkedMemories: number
  }

  totalCreated: number
  totalEnriched: number
  totalLinkedMemories: number
}



export type WikiPhoneSyncResult = {
  character: string
  fetchedAt: string

  discovered: number
  created: number
  updated: number
  skipped: number
  duplicateSkipped: number
  errors: string[]

  voiceCalls: number
  videoCalls: number

  sources: {
    wikiGG: number
  }
}


export type WikiPageFreshnessStatus = {
  id: string
  label: string
  sourceUrl: string
  purgeUrl: string
  checkedAt: string
  updatedAt: string | null
  ageHours: number | null
  fresh: boolean | null
  stale: boolean
  autoPurgeAttempted: boolean
  autoPurgeSucceeded: boolean | null
  error: string | null
}


export type WikiCacheFreshnessResult = {
  checkedAt: string
  maxAgeHours: number
  allFresh: boolean
  needsAttention: boolean
  pages: WikiPageFreshnessStatus[]
}


export type WikiSyncProgress = {
  phase:
    | 'fetching-list'
    | 'resolving-artwork'
    | 'importing'
    | 'complete'

  current: number
  total: number
  percent: number
  message: string
}


export type WikiSyncJob = {
  id: string
  character: string
  status:
    | 'running'
    | 'complete'
    | 'error'

  progress:
    WikiSyncProgress

  result:
    WikiSyncResult | null

  supplementalResult:
    SupplementalSyncResult | null

  phoneResult?:
    WikiPhoneSyncResult | null

  phoneError?:
    string | null

  error:
    string | null
}


export type CatalogForm = {
  canonicalName: string
  character: string
  category: string
  subcategory: string
  releaseDate: string
  rarity: string
  position: string
  attribute: string
  source: string
  imageUrl: string
  sourceName: string
  sourceUrl: string
  sourceKey: string
  sourceUpdatedAt: string
  manualNotes: string
}
