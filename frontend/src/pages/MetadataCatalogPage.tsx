import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  AutoMatchResult,
  BulkMatchOption,
  BulkMatchRow,
  BulkOverrideRow,
  CatalogForm,
  CatalogItem,
  CatalogRelationshipView,
  CatalogStats,
  MatchCandidate,
  SupplementalSyncResult,
  WikiCacheFreshnessResult,
  WikiPhoneSyncResult,
  WikiPreviewResponse,
  WikiSyncProgress,
  WikiSyncResult,
} from '../features/catalog/catalogTypes'

import {
  deleteCatalogRecord,
  fetchBulkMatchOptions,
  fetchBulkOverridePreview,
  fetchAllCatalogItemIds,
  fetchAllCatalogItems,
  fetchCatalog,
  fetchCatalogCandidates,
  fetchCatalogRelationshipItems,
  fetchCatalogStats,
  fetchWikiCacheStatus,
  fetchWikiMemoryPreview,
  fetchWikiMemorySyncJob,
  linkCatalogFile,
  overrideCatalogFileName,
  refreshWikiCacheStatus,
  runCatalogAutoMatch,
  saveCatalogRecord,
  startWikiMemorySync,
  syncPhoneCatalog,
} from '../features/catalog/catalogApi'

import {
  blankForm,
  itemToForm,
  nullableText,
} from '../features/catalog/catalogForms'


import CatalogPageIntro
  from '../features/catalog/components/CatalogPageIntro'
import CatalogWorkspaceControls
  from '../features/catalog/components/CatalogWorkspaceControls'
import CatalogTableSection
  from '../features/catalog/components/CatalogTableSection'
import CatalogEditorModal
  from '../features/catalog/components/CatalogEditorModal'
import CatalogWikiSyncPanel
  from '../features/catalog/components/CatalogWikiSyncPanel'
import CatalogBulkOverridePanel
  from '../features/catalog/components/CatalogBulkOverridePanel'
import CatalogBulkMatchModal
  from '../features/catalog/components/CatalogBulkMatchModal'
import CatalogMatchFileModal
  from '../features/catalog/components/CatalogMatchFileModal'
import CatalogPagination
  from '../features/catalog/components/CatalogPagination'


const CATALOG_PAGE_SIZE =
  100


const WIKI_SYNC_CHARACTERS = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function MetadataCatalogPage() {

  const [
    items,
    setItems,
  ] =
    useState<CatalogItem[]>(
      []
    )


  const [
    stats,
    setStats,
  ] =
    useState<CatalogStats | null>(
      null
    )


  const [
    catalogPage,
    setCatalogPage,
  ] =
    useState(
      1
    )


  const [
    catalogCount,
    setCatalogCount,
  ] =
    useState(
      0
    )


  const [
    searchText,
    setSearchText,
  ] =
    useState(
      ''
    )


  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState(
      ''
    )


  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(
      ''
    )


  const [
    characterCategoryCounts,
    setCharacterCategoryCounts,
  ] =
    useState<
      Record<
        string,
        number
      >
    >({})


  const [
    includedCategories,
    setIncludedCategories,
  ] =
    useState<string[] | null>(
      null
    )


  const effectiveIncludedCategories =
    useMemo(
      () => {

        if (
          includedCategories
        ) {

          return includedCategories

        }


        return (
          stats?.categories
            .map(
              (entry) =>
                entry.category
            )
            .filter(
              (category) =>
                category !==
                'Memory'
            ) ??
          []
        )

      },
      [
        includedCategories,
        stats?.categories,
      ]
    )


  const includedCategorySet =
    useMemo(
      () =>
        new Set(
          effectiveIncludedCategories
        ),
      [
        effectiveIncludedCategories,
      ]
    )


  const allCategoriesDisplayCount =
    useMemo(
      () => {

        if (
          selectedCharacter
        ) {

          return effectiveIncludedCategories
            .reduce(
              (
                total,
                category
              ) =>
                total +
                (
                  characterCategoryCounts[
                    category
                  ] ??
                  0
                ),
              0
            )

        }


        return (
          stats?.categories
            .filter(
              (entry) =>
                includedCategorySet.has(
                  entry.category
                )
            )
            .reduce(
              (
                total,
                entry
              ) =>
                total +
                entry.count,
              0
            ) ??
          0
        )

      },
      [
        characterCategoryCounts,
        effectiveIncludedCategories,
        includedCategorySet,
        selectedCharacter,
        stats?.categories,
      ]
    )


  const [
    selectedRarity,
    setSelectedRarity,
  ] =
    useState(
      ''
    )


  const [
    fileFilter,
    setFileFilter,
  ] =
    useState(
      ''
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(
      false
    )


  const [
    editingItem,
    setEditingItem,
  ] =
    useState<CatalogItem | null>(
      null
    )


  const [
    form,
    setForm,
  ] =
    useState<CatalogForm>(
      blankForm
    )


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    )


  const [
    saveError,
    setSaveError,
  ] =
    useState(
      ''
    )


  const [
    matching,
    setMatching,
  ] =
    useState(
      false
    )


  const [
    matchResult,
    setMatchResult,
  ] =
    useState<AutoMatchResult | null>(
      null
    )


  const [
    matchingItem,
    setMatchingItem,
  ] =
    useState<CatalogItem | null>(
      null
    )


  const [
    matchCandidates,
    setMatchCandidates,
  ] =
    useState<MatchCandidate[]>(
      []
    )


  const [
    candidateLoading,
    setCandidateLoading,
  ] =
    useState(
      false
    )


  const [
    candidateError,
    setCandidateError,
  ] =
    useState(
      ''
    )


  const [
    confirmingPath,
    setConfirmingPath,
  ] =
    useState<string | null>(
      null
    )


  const [
    bulkOverrideLoaded,
    setBulkOverrideLoaded,
  ] =
    useState(
      false
    )


  const [
    bulkOverrideFilterKey,
    setBulkOverrideFilterKey,
  ] =
    useState(
      ''
    )


  const [
    bulkOverrideLoading,
    setBulkOverrideLoading,
  ] =
    useState(
      false
    )


  const [
    bulkOverrideSaving,
    setBulkOverrideSaving,
  ] =
    useState(
      false
    )


  const [
    bulkOverrideRows,
    setBulkOverrideRows,
  ] =
    useState<BulkOverrideRow[]>(
      []
    )


  const [
    bulkOverrideSelections,
    setBulkOverrideSelections,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >(
      {}
    )


  const [
    bulkOverrideProgress,
    setBulkOverrideProgress,
  ] =
    useState({
      current:
        0,

      total:
        0,
    })


  const [
    bulkOverrideError,
    setBulkOverrideError,
  ] =
    useState(
      ''
    )


  const [
    bulkOverrideMessage,
    setBulkOverrideMessage,
  ] =
    useState(
      ''
    )


  const [
    bulkMatchOpen,
    setBulkMatchOpen,
  ] =
    useState(
      false
    )


  const [
    bulkMatchLoading,
    setBulkMatchLoading,
  ] =
    useState(
      false
    )


  const [
    bulkMatchSaving,
    setBulkMatchSaving,
  ] =
    useState(
      false
    )


  const [
    bulkMatchRows,
    setBulkMatchRows,
  ] =
    useState<BulkMatchRow[]>(
      []
    )


  const [
    bulkSelections,
    setBulkSelections,
  ] =
    useState<
      Record<
        number,
        string
      >
    >(
      {}
    )


  const [
    bulkMatchError,
    setBulkMatchError,
  ] =
    useState(
      ''
    )


  const [
    bulkMatchMessage,
    setBulkMatchMessage,
  ] =
    useState(
      ''
    )


  const [
    overrideBusyId,
    setOverrideBusyId,
  ] =
    useState<number | null>(
      null
    )


  const [
    overrideMessage,
    setOverrideMessage,
  ] =
    useState(
      ''
    )


  const [
    overrideError,
    setOverrideError,
  ] =
    useState(
      ''
    )


  const [
    relationshipView,
    setRelationshipView,
  ] =
    useState<CatalogRelationshipView | null>(
      null
    )


  const [
    relationshipLoadingId,
    setRelationshipLoadingId,
  ] =
    useState<number | null>(
      null
    )


  const [
    relationshipError,
    setRelationshipError,
  ] =
    useState(
      ''
    )


  const [
    wikiCharacter,
    setWikiCharacter,
  ] =
    useState(
      'Xavier'
    )


  const [
    wikiPreview,
    setWikiPreview,
  ] =
    useState<WikiPreviewResponse | null>(
      null
    )


  const [
    wikiLoading,
    setWikiLoading,
  ] =
    useState(
      false
    )


  const [
    wikiError,
    setWikiError,
  ] =
    useState(
      ''
    )


  const [
    wikiSyncResult,
    setWikiSyncResult,
  ] =
    useState<WikiSyncResult | null>(
      null
    )


  const [
    supplementalSyncResult,
    setSupplementalSyncResult,
  ] =
    useState<SupplementalSyncResult | null>(
      null
    )


  const [
    phonePipelineResult,
    setPhonePipelineResult,
  ] =
    useState<WikiPhoneSyncResult | null>(
      null
    )


  const [
    phonePipelineError,
    setPhonePipelineError,
  ] =
    useState(
      ''
    )


  const [
    phoneLoading,
    setPhoneLoading,
  ] =
    useState(
      false
    )


  const [
    wikiSyncProgress,
    setWikiSyncProgress,
  ] =
    useState<WikiSyncProgress | null>(
      null
    )


  const [
    wikiCacheFreshness,
    setWikiCacheFreshness,
  ] =
    useState<WikiCacheFreshnessResult | null>(
      null
    )


  const [
    wikiCacheLoading,
    setWikiCacheLoading,
  ] =
    useState(
      false
    )


  const [
    wikiCacheError,
    setWikiCacheError,
  ] =
    useState(
      ''
    )


  useEffect(
    () => {

      let cancelled =
        false


      async function loadWikiCacheFreshness() {

        try {

          setWikiCacheLoading(
            true
          )


          const result =
            await fetchWikiCacheStatus()


          if (
            cancelled
          ) {

            return

          }


          setWikiCacheFreshness(
            result
          )


          setWikiCacheError(
            ''
          )

        } catch (error) {

          console.error(
            'Unable to check wiki page freshness:',
            error
          )


          if (
            !cancelled
          ) {

            setWikiCacheError(
              error instanceof
                Error
                ? error.message
                : 'Unable to check wiki page freshness.'
            )

          }

        } finally {

          if (
            !cancelled
          ) {

            setWikiCacheLoading(
              false
            )

          }

        }

      }


      void loadWikiCacheFreshness()


      return () => {

        cancelled =
          true

      }

    },
    []
  )


  const filterQueryString =
    useMemo(
      () => {

        const query =
          new URLSearchParams()


        if (
          searchText.trim()
        ) {

          query.set(
            'q',
            searchText.trim()
          )

        }


        if (
          selectedCharacter
        ) {

          query.set(
            'character',
            selectedCharacter
          )

        }


        if (
          selectedCategory
        ) {

          query.set(
            'category',
            selectedCategory
          )

        } else if (
          includedCategories !==
            null ||
          effectiveIncludedCategories.length >
            0
        ) {

          query.set(
            'categories',
            effectiveIncludedCategories.join(
              '|'
            )
          )

        }


        if (
          selectedRarity
        ) {

          query.set(
            'rarity',
            selectedRarity
          )

        } else {

          /*
           * "All Rarities" means the archive-relevant
           * set. 3-star records remain available through
           * the explicit 3 Star filter but do not appear
           * in the default/all-rarities view.
           */
          query.set(
            'excludeRarity',
            '3'
          )

        }


        if (
          fileFilter
        ) {

          query.set(
            'hasFile',
            fileFilter
          )

        }


        const value =
          query.toString()


        return (
          value
            ? `?${value}`
            : ''
        )

      },
      [
        effectiveIncludedCategories,
        fileFilter,
        includedCategories,
        searchText,
        selectedCategory,
        selectedCharacter,
        selectedRarity,
      ]
    )


  const queryString =
    useMemo(
      () => {

        const query =
          new URLSearchParams(
            filterQueryString.startsWith(
              '?'
            )
              ? filterQueryString.slice(
                  1
                )
              : filterQueryString
          )


        query.set(
          'limit',
          String(
            CATALOG_PAGE_SIZE
          )
        )


        query.set(
          'offset',
          String(
            (
              catalogPage -
              1
            ) *
            CATALOG_PAGE_SIZE
          )
        )


        return `?${query.toString()}`

      },
      [
        catalogPage,
        filterQueryString,
      ]
    )


  const catalogPageCount =
    Math.max(
      1,
      Math.ceil(
        catalogCount /
        CATALOG_PAGE_SIZE
      )
    )


  const catalogRangeStart =
    catalogCount ===
      0
      ? 0
      : (
          (
            catalogPage -
            1
          ) *
          CATALOG_PAGE_SIZE
        ) +
        1


  const catalogRangeEnd =
    Math.min(
      catalogCount,
      catalogPage *
        CATALOG_PAGE_SIZE
    )


  const characterCountRefreshKey =
    [
      stats?.totalItems ??
        0,

      wikiSyncResult
        ?.fetchedAt ??
        '',

      supplementalSyncResult
        ?.fetchedAt ??
        '',

      phonePipelineResult
        ?.fetchedAt ??
        '',
    ]
      .join(
        ':'
      )


  useEffect(
    () => {

      /*
       * Referencing the key here makes the dependency
       * intentional for exhaustive-deps. When a wiki
       * sync completes or the catalog total changes,
       * this effect reloads the selected character's
       * category counts.
       */
      void characterCountRefreshKey


      let cancelled =
        false


      async function loadCharacterCategoryCounts() {

        if (
          !selectedCharacter
        ) {

          setCharacterCategoryCounts(
            {}
          )


          return

        }


        try {

          const query =
            new URLSearchParams({
              character:
                selectedCharacter,

              excludeRarity:
                '3',
            })


          const characterItems =
            await fetchAllCatalogItems(
              `?${query}`
            )


          if (
            cancelled
          ) {

            return

          }


          const counts:
            Record<
              string,
              number
            > = {}


          for (
            const item
            of characterItems
          ) {

            counts[
              item.category
            ] =
              (
                counts[
                  item.category
                ] ??
                0
              ) +
              1

          }


          setCharacterCategoryCounts(
            counts
          )


        } catch (error) {

          console.error(
            'Unable to load character category counts:',
            error
          )

        }

      }


      void loadCharacterCategoryCounts()


      return () => {

        cancelled =
          true

      }

    },
    [
      selectedCharacter,
      characterCountRefreshKey,
    ]
  )


  const bulkOverrideCurrent =
    bulkOverrideLoaded &&
    bulkOverrideFilterKey ===
      filterQueryString


  const loadCatalog =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          )


          const [
            catalogData,
            statsData,
          ] =
            await Promise.all([
              fetchCatalog(
                queryString
              ),
              fetchCatalogStats(),
            ])


          setCatalogCount(
            catalogData.count
          )


          const maxPage =
            Math.max(
              1,
              Math.ceil(
                catalogData.count /
                CATALOG_PAGE_SIZE
              )
            )


          if (
            catalogPage >
            maxPage
          ) {

            setCatalogPage(
              maxPage
            )

            return

          }


          setItems(
            catalogData.items
          )


          setStats(
            statsData
          )


          setError(
            ''
          )

        } catch (loadError) {

          console.error(
            loadError
          )


          setError(
            'Metadata catalog could not be loaded.'
          )

        } finally {

          setLoading(
            false
          )

        }

      },
      [
        catalogPage,
        queryString,
      ]
    )


  useEffect(
    () => {

      let cancelled =
        false


      async function loadInitialCatalog() {

        try {

          const [
            catalogData,
            statsData,
          ] =
            await Promise.all([
              fetchCatalog(
                queryString
              ),
              fetchCatalogStats(),
            ])


          if (
            cancelled
          ) {

            return

          }


          setCatalogCount(
            catalogData.count
          )


          const maxPage =
            Math.max(
              1,
              Math.ceil(
                catalogData.count /
                CATALOG_PAGE_SIZE
              )
            )


          if (
            catalogPage >
            maxPage
          ) {

            setCatalogPage(
              maxPage
            )

            return

          }


          setItems(
            catalogData.items
          )


          setStats(
            statsData
          )


          setError(
            ''
          )

        } catch (loadError) {

          console.error(
            loadError
          )


          if (
            cancelled
          ) {

            return

          }


          setError(
            'Metadata catalog could not be loaded.'
          )

        } finally {

          if (
            !cancelled
          ) {

            setLoading(
              false
            )

          }

        }

      }


      void loadInitialCatalog()


      return () => {

        cancelled =
          true

      }

    },
    [
      catalogPage,
      queryString,
    ]
  )


  function updateForm(
    field:
      keyof CatalogForm,
    value:
      string
  ) {

    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    )

  }


  function openNewRecord() {

    setEditingItem(
      null
    )


    setForm({
      ...blankForm,
    })


    setSaveError(
      ''
    )


    setEditorOpen(
      true
    )

  }


  function openEditRecord(
    item: CatalogItem
  ) {

    setEditingItem(
      item
    )


    setForm(
      itemToForm(
        item
      )
    )


    setSaveError(
      ''
    )


    setEditorOpen(
      true
    )

  }


  function closeEditor() {

    if (
      saving
    ) {

      return

    }


    setEditorOpen(
      false
    )


    setEditingItem(
      null
    )


    setSaveError(
      ''
    )

  }


  async function saveRecord() {

    if (
      !form.canonicalName.trim() ||
      !form.category.trim()
    ) {

      setSaveError(
        'Name and category are required.'
      )

      return

    }


    let rarity:
      number | null =
      null


    if (
      form.rarity.trim()
    ) {

      rarity =
        Number(
          form.rarity
        )


      if (
        !Number.isInteger(
          rarity
        )
      ) {

        setSaveError(
          'Rarity must be a whole number.'
        )

        return

      }

    }


    try {

      setSaving(
        true
      )


      setSaveError(
        ''
      )


      const body = {

        canonicalName:
          form.canonicalName.trim(),

        character:
          nullableText(
            form.character
          ),

        category:
          form.category.trim(),

        subcategory:
          nullableText(
            form.subcategory
          ),

        releaseDate:
          nullableText(
            form.releaseDate
          ),

        rarity,

        position:
          nullableText(
            form.position
          ),

        attribute:
          nullableText(
            form.attribute
          ),

        source:
          nullableText(
            form.source
          ),

        imageUrl:
          nullableText(
            form.imageUrl
          ),

        sourceName:
          nullableText(
            form.sourceName
          ),

        sourceUrl:
          nullableText(
            form.sourceUrl
          ),

        sourceKey:
          nullableText(
            form.sourceKey
          ),

        sourceUpdatedAt:
          nullableText(
            form.sourceUpdatedAt
          ),

        manualNotes:
          nullableText(
            form.manualNotes
          ),

      }


      await saveCatalogRecord(
        editingItem?.id ??
          null,
        body
      )


      setEditorOpen(
        false
      )


      setEditingItem(
        null
      )


      await loadCatalog()

    } catch (saveRecordError) {

      console.error(
        saveRecordError
      )


      setSaveError(
        saveRecordError instanceof
          Error
          ? saveRecordError.message
          : 'Unable to save catalog record.'
      )

    } finally {

      setSaving(
        false
      )

    }

  }


  async function deleteRecord(
    item: CatalogItem
  ) {

    const confirmed =
      window.confirm(
        `Delete "${item.canonicalName}" from the metadata catalog?`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      await deleteCatalogRecord(
        item.id
      )


      await loadCatalog()

    } catch (deleteError) {

      console.error(
        deleteError
      )


      setError(
        'The catalog record could not be deleted.'
      )

    }

  }


  async function refreshWikiCacheFreshness() {

    try {

      setWikiCacheLoading(
        true
      )


      const result =
        await refreshWikiCacheStatus()


      setWikiCacheFreshness(
        result
      )


      setWikiCacheError(
        ''
      )


      return result

    } catch (error) {

      console.error(
        'Unable to refresh wiki page freshness:',
        error
      )


      const message =
        error instanceof
          Error
          ? error.message
          : 'Unable to refresh wiki page freshness.'


      setWikiCacheError(
        message
      )


      throw error

    } finally {

      setWikiCacheLoading(
        false
      )

    }

  }


  async function ensureWikiPagesFresh() {

    const result =
      await refreshWikiCacheFreshness()


    if (
      result.needsAttention
    ) {

      setWikiError(
        'One or more wiki source pages are still more than 24 hours out of date. Use the cache warning links below, purge those pages, then check again before syncing.'
      )


      return false

    }


    return true

  }


  async function previewWikiMemories() {

    try {

      setWikiLoading(
        true
      )


      setWikiError(
        ''
      )


      setWikiSyncResult(
        null
      )


      if (
        !(await ensureWikiPagesFresh())
      ) {

        return

      }


      const characters =
        wikiCharacter ===
          'All'
          ? WIKI_SYNC_CHARACTERS
          : [
              wikiCharacter,
            ]


      const previews:
        WikiPreviewResponse[] =
        []


      for (
        const character
        of characters
      ) {

        previews.push(
          await fetchWikiMemoryPreview(
            character
          )
        )

      }


      if (
        previews.length ===
          1
      ) {

        setWikiPreview(
          previews[0]
        )


        return

      }


      setWikiPreview({
        character:
          'All',

        count:
          previews.reduce(
            (
              total,
              preview
            ) =>
              total +
              preview.count,
            0
          ),

        items:
          previews.flatMap(
            (preview) =>
              preview.items
          ),
      })

    } catch (previewError) {

      console.error(
        previewError
      )


      setWikiError(
        previewError instanceof
          Error
          ? previewError.message
          : 'Unable to preview wiki memories.'
      )

    } finally {

      setWikiLoading(
        false
      )

    }

  }


  async function syncWikiMemories() {

    try {

      setWikiLoading(
        true
      )


      setWikiError(
        ''
      )


      setWikiSyncResult(
        null
      )


      setSupplementalSyncResult(
        null
      )


      if (
        !(await ensureWikiPagesFresh())
      ) {

        return

      }


      const characters =
        wikiCharacter ===
          'All'
          ? WIKI_SYNC_CHARACTERS
          : [
              wikiCharacter,
            ]


      let aggregateMemory:
        WikiSyncResult | null =
        null


      let aggregateSupplemental:
        SupplementalSyncResult | null =
        null


      for (
        let characterIndex =
          0;
        characterIndex <
          characters.length;
        characterIndex +=
          1
      ) {

        const character =
          characters[
            characterIndex
          ]


        setWikiSyncProgress({
          phase:
            'fetching-list',

          current:
            characterIndex,

          total:
            characters.length,

          percent:
            Math.round(
              (
                characterIndex /
                characters.length
              ) *
              100
            ),

          message:
            wikiCharacter ===
              'All'
              ? `Starting ${character} (${characterIndex + 1} of ${characters.length})...`
              : `Starting ${character} wiki sync...`,
        })


        const started =
          await startWikiMemorySync(
            character
          )


        let finished =
          false


        while (
          !finished
        ) {

          await new Promise<void>(
            (resolve) => {

              window.setTimeout(
                resolve,
                750
              )

            }
          )


          const job =
            await fetchWikiMemorySyncJob(
              started.jobId
            )


          const globalPercent =
            wikiCharacter ===
              'All'
              ? Math.min(
                  99,
                  Math.round(
                    (
                      (
                        characterIndex *
                        100
                      ) +
                      job.progress.percent
                    ) /
                    characters.length
                  )
                )
              : job.progress.percent


          setWikiSyncProgress({
            ...job.progress,

            percent:
              globalPercent,

            current:
              wikiCharacter ===
                'All'
                ? characterIndex +
                  (
                    job.progress.percent /
                    100
                  )
                : job.progress.current,

            total:
              wikiCharacter ===
                'All'
                ? characters.length
                : job.progress.total,

            message:
              wikiCharacter ===
                'All'
                ? `${character}: ${job.progress.message}`
                : job.progress.message,
          })


          if (
            job.status ===
              'error'
          ) {

            throw new Error(
              job.error ??
              `Wiki sync failed for ${character}.`
            )

          }


          if (
            job.status !==
              'complete'
          ) {

            continue

          }


          finished =
            true


          if (
            job.result
          ) {

            if (
              !aggregateMemory
            ) {

              aggregateMemory = {
                ...job.result,

                character:
                  wikiCharacter ===
                    'All'
                    ? 'All'
                    : job.result.character,
              }

            } else {

              const current =
                aggregateMemory as
                  WikiSyncResult


              aggregateMemory = {
                character:
                  current.character,

                sourceUrl:
                  current.sourceUrl,

                fetchedAt:
                  job.result.fetchedAt,

                discovered:
                  current.discovered +
                  job.result.discovered,

                created:
                  current.created +
                  job.result.created,

                updated:
                  current.updated +
                  job.result.updated,

                skipped:
                  current.skipped +
                  job.result.skipped,
              }

            }

          }


          if (
            job.supplementalResult
          ) {

            const result =
              job.supplementalResult


            if (
              !aggregateSupplemental
            ) {

              aggregateSupplemental = {
                ...result,

                character:
                  wikiCharacter ===
                    'All'
                    ? 'All'
                    : result.character,

                fallingForYou: {
                  ...result.fallingForYou,
                },

                byYourSide: {
                  ...result.byYourSide,
                },
              }

            } else {

              const current =
                aggregateSupplemental as
                  SupplementalSyncResult


              aggregateSupplemental = {
                character:
                  current.character,

                fetchedAt:
                  result.fetchedAt,

                fallingForYou: {
                  discovered:
                    current
                      .fallingForYou
                      .discovered +
                    result
                      .fallingForYou
                      .discovered,

                  created:
                    current
                      .fallingForYou
                      .created +
                    result
                      .fallingForYou
                      .created,

                  enriched:
                    current
                      .fallingForYou
                      .enriched +
                    result
                      .fallingForYou
                      .enriched,

                  existing:
                    current
                      .fallingForYou
                      .existing +
                    result
                      .fallingForYou
                      .existing,

                  skipped:
                    current
                      .fallingForYou
                      .skipped +
                    result
                      .fallingForYou
                      .skipped,
                },

                byYourSide: {
                  discovered:
                    current
                      .byYourSide
                      .discovered +
                    result
                      .byYourSide
                      .discovered,

                  created:
                    current
                      .byYourSide
                      .created +
                    result
                      .byYourSide
                      .created,

                  existingMemory:
                    current
                      .byYourSide
                      .existingMemory +
                    result
                      .byYourSide
                      .existingMemory,

                  existingSupplemental:
                    current
                      .byYourSide
                      .existingSupplemental +
                    result
                      .byYourSide
                      .existingSupplemental,

                  skipped:
                    current
                      .byYourSide
                      .skipped +
                    result
                      .byYourSide
                      .skipped,

                  linkedMemories:
                    current
                      .byYourSide
                      .linkedMemories +
                    result
                      .byYourSide
                      .linkedMemories,
                },

                totalCreated:
                  current
                    .totalCreated +
                  result
                    .totalCreated,

                totalEnriched:
                  current
                    .totalEnriched +
                  result
                    .totalEnriched,

                totalLinkedMemories:
                  current
                    .totalLinkedMemories +
                  result
                    .totalLinkedMemories,
              }

            }

          }

        }

      }


      setWikiSyncResult(
        aggregateMemory
      )


      setSupplementalSyncResult(
        aggregateSupplemental
      )


      setWikiSyncProgress({
        phase:
          'complete',

        current:
          characters.length,

        total:
          characters.length,

        percent:
          100,

        message:
          wikiCharacter ===
            'All'
            ? 'Complete: all five characters synced.'
            : `Complete: ${wikiCharacter} synced.`,
      })


      await loadCatalog()

    } catch (syncError) {

      console.error(
        syncError
      )


      setWikiError(
        syncError instanceof
          Error
          ? syncError.message
          : 'Unable to sync wiki memories.'
      )

    } finally {

      setWikiLoading(
        false
      )

    }

  }


  async function syncPhoneMetadata() {

    try {

      setPhoneLoading(
        true
      )


      setPhonePipelineError(
        ''
      )


      if (
        !(await ensureWikiPagesFresh())
      ) {

        setPhonePipelineError(
          'Phone sync paused because one or more wiki source pages are still more than 24 hours out of date.'
        )


        return

      }


      const characters =
        wikiCharacter ===
          'All'
          ? WIKI_SYNC_CHARACTERS
          : [
              wikiCharacter,
            ]


      let aggregate:
        WikiPhoneSyncResult | null =
        null


      for (
        const character
        of characters
      ) {

        const data =
          await syncPhoneCatalog(
            character
          )


        if (
          !aggregate
        ) {

          aggregate = {
            ...data,

            character:
              wikiCharacter ===
                'All'
                ? 'All'
                : data.character,

            sources: {
              ...data.sources,
            },
          }

        } else {

          const current =
            aggregate as
              WikiPhoneSyncResult


          aggregate = {
            character:
              current.character,

            fetchedAt:
              data.fetchedAt,

            discovered:
              current.discovered +
              data.discovered,

            created:
              current.created +
              data.created,

            updated:
              current.updated +
              data.updated,

            skipped:
              current.skipped +
              data.skipped,

            voiceCalls:
              current.voiceCalls +
              data.voiceCalls,

            videoCalls:
              current.videoCalls +
              data.videoCalls,

            sources: {
              wikiGG:
                current.sources.wikiGG +
                data.sources.wikiGG,
            },
          }

        }

      }


      setPhonePipelineResult(
        aggregate
      )


      await loadCatalog()

    } catch (phoneError) {

      console.error(
        phoneError
      )


      setPhonePipelineError(
        phoneError instanceof
          Error
          ? phoneError.message
          : 'Unable to sync phone metadata.'
      )

    } finally {

      setPhoneLoading(
        false
      )

    }

  }



  async function loadBulkOverridePreview() {

    try {

      setBulkOverrideLoading(
        true
      )


      setBulkOverrideError(
        ''
      )


      /*
       * Pagination only limits what is rendered in
       * the table. Bulk Override must still operate
       * on the complete active filter set.
       */
      const filteredCatalogItemIds =
        await fetchAllCatalogItemIds(
          filterQueryString
        )


      const preview =
        await fetchBulkOverridePreview(
          filteredCatalogItemIds
        )


      setBulkOverrideRows(
        preview.rows
      )


      /*
       * Every eligible matched item begins at YES,
       * exactly as requested. Multi-file records are
       * visible but cannot participate in the bulk run.
       */
      setBulkOverrideSelections(
        Object.fromEntries(
          preview.rows.map(
            (row) => [
              row.catalogItemId,
              row.eligible,
            ]
          )
        )
      )


      setBulkOverrideFilterKey(
        filterQueryString
      )


      setBulkOverrideLoaded(
        true
      )

    } catch (loadError) {

      console.error(
        loadError
      )


      setBulkOverrideError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Unable to load matched files for bulk Override.'
      )

    } finally {

      setBulkOverrideLoading(
        false
      )

    }

  }


  function setBulkOverrideChoice(
    catalogItemId:
      number,
    value:
      boolean
  ) {

    setBulkOverrideSelections(
      (current) => ({
        ...current,

        [catalogItemId]:
          value,
      })
    )

  }


  function setAllBulkOverrideChoices(
    value:
      boolean
  ) {

    setBulkOverrideSelections(
      Object.fromEntries(
        bulkOverrideRows.map(
          (row) => [
            row.catalogItemId,
            row.eligible
              ? value
              : false,
          ]
        )
      )
    )

  }


  async function runBulkOverride() {

    const selectedRows =
      bulkOverrideRows.filter(
        (row) =>
          row.eligible &&
          bulkOverrideSelections[
            row.catalogItemId
          ]
      )


    if (
      selectedRows.length ===
      0
    ) {

      setBulkOverrideError(
        'No matched files are set to Yes.'
      )


      return

    }


    const confirmed =
      window.confirm(
        `Rename ${selectedRows.length} matched ${
          selectedRows.length ===
            1
            ? 'file'
            : 'files'
        } to their catalog item names?`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setBulkOverrideSaving(
        true
      )


      setBulkOverrideError(
        ''
      )


      setBulkOverrideMessage(
        ''
      )


      setBulkOverrideProgress({
        current:
          0,

        total:
          selectedRows.length,
      })


      let renamed =
        0


      let unchanged =
        0


      const failures:
        string[] =
        []


      for (
        const [
          index,
          row,
        ]
        of selectedRows.entries()
      ) {

        setBulkOverrideProgress({
          current:
            index +
            1,

          total:
            selectedRows.length,
        })


        try {

          const data =
            await overrideCatalogFileName(
              row.catalogItemId,
              'Unable to rename this file.'
            )


          if (
            data?.changed ===
            false
          ) {

            unchanged +=
              1

          } else {

            renamed +=
              1

          }

        } catch (rowError) {

          console.error(
            `Bulk Override failed for ${row.itemName}:`,
            rowError
          )


          failures.push(
            `${row.itemName}: ${
              rowError instanceof
                Error
                ? rowError.message
                : 'Unknown error'
            }`
          )

        }

      }


      const pieces = [
        `${renamed} renamed`,
        `${unchanged} already correct`,
      ]


      if (
        failures.length >
        0
      ) {

        pieces.push(
          `${failures.length} failed`
        )

      }


      setBulkOverrideMessage(
        pieces.join(
          ' · '
        )
      )


      if (
        failures.length >
        0
      ) {

        setBulkOverrideError(
          failures
            .slice(
              0,
              5
            )
            .join(
              ' | '
            )
        )

      }


      await loadCatalog()


      await loadBulkOverridePreview()

    } finally {

      setBulkOverrideSaving(
        false
      )


      setBulkOverrideProgress({
        current:
          0,

        total:
          0,
      })

    }

  }


  function bulkMatchOptionKey(
    option:
      BulkMatchOption
  ) {

    return `${option.category}\n${option.relativePath}`

  }


  async function openBulkMatchView() {

    if (
      catalogCount ===
      0
    ) {

      return

    }


    try {

      setBulkMatchOpen(
        true
      )


      setBulkMatchLoading(
        true
      )


      setBulkMatchError(
        ''
      )


      setBulkMatchMessage(
        ''
      )


      setBulkSelections(
        {}
      )


      const filteredCatalogItemIds =
        await fetchAllCatalogItemIds(
          filterQueryString
        )


      const data =
        await fetchBulkMatchOptions(
          filteredCatalogItemIds
        )


      setBulkMatchRows(
        data.rows
      )

    } catch (loadError) {

      console.error(
        loadError
      )


      setBulkMatchError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Unable to load filtered match options.'
      )

    } finally {

      setBulkMatchLoading(
        false
      )

    }

  }


  function closeBulkMatchView() {

    if (
      bulkMatchSaving
    ) {

      return

    }


    setBulkMatchOpen(
      false
    )


    setBulkMatchRows(
      []
    )


    setBulkSelections(
      {}
    )


    setBulkMatchError(
      ''
    )

  }


  function chooseBulkMatch(
    catalogItemId:
      number,
    optionKey:
      string
  ) {

    setBulkSelections(
      (current) => ({
        ...current,

        [catalogItemId]:
          optionKey,
      })
    )

  }


  async function saveBulkMatches() {

    const selected =
      bulkMatchRows
        .map(
          (row) => {

            const selectedKey =
              bulkSelections[
                row.catalogItemId
              ]


            if (
              !selectedKey
            ) {

              return null

            }


            const option =
              row.options.find(
                (candidate) =>
                  bulkMatchOptionKey(
                    candidate
                  ) ===
                  selectedKey
              )


            return option
              ? {
                  row,
                  option,
                }
              : null

          }
        )
        .filter(
          (
            value
          ): value is {
            row: BulkMatchRow
            option: BulkMatchOption
          } =>
            Boolean(
              value
            )
        )


    if (
      selected.length ===
      0
    ) {

      setBulkMatchError(
        'Select at least one unmatched file first.'
      )


      return

    }


    try {

      setBulkMatchSaving(
        true
      )


      setBulkMatchError(
        ''
      )


      let linked =
        0


      for (
        const {
          row,
          option,
        }
        of selected
      ) {

        await linkCatalogFile(
          row.catalogItemId,
          {
            category:
              option.category,

            relativePath:
              option.relativePath,

            matchMethod:
              'manual-bulk',

            confidence:
              option.confidence,

            manuallyConfirmed:
              true,
          },
          `Unable to link ${row.catalogName}.`
        )


        linked +=
          1

      }


      setBulkMatchMessage(
        `${linked} filtered ${
          linked ===
            1
            ? 'item'
            : 'items'
        } matched.`
      )


      setBulkMatchOpen(
        false
      )


      setBulkMatchRows(
        []
      )


      setBulkSelections(
        {}
      )


      await loadCatalog()

    } catch (saveFailure) {

      console.error(
        saveFailure
      )


      setBulkMatchError(
        saveFailure instanceof
          Error
          ? saveFailure.message
          : 'Unable to save filtered matches.'
      )


      /*
       * Some earlier rows may already have succeeded.
       * Reload so the page never shows stale file status.
       */
      await loadCatalog()

    } finally {

      setBulkMatchSaving(
        false
      )

    }

  }


  function reviewCandidateKey(
    candidate:
      AutoMatchResult['needsReview'][number]
  ) {

    return `${candidate.catalogItemId}:${candidate.relativePath}`

  }


  async function acceptAutoMatchReview(
    candidate:
      AutoMatchResult['needsReview'][number]
  ) {

    try {

      setConfirmingPath(
        reviewCandidateKey(
          candidate
        )
      )


      setError(
        ''
      )


      await linkCatalogFile(
        candidate.catalogItemId,
        {
          category:
            candidate.category,

          relativePath:
            candidate.relativePath,

          matchMethod:
            'review',

          confidence:
            candidate.confidence,

          manuallyConfirmed:
            true,
        },
        'Unable to confirm reviewed match.'
      )


      setMatchResult(
        (current) => {

          if (
            !current
          ) {

            return current

          }


          const key =
            reviewCandidateKey(
              candidate
            )


          return {
            ...current,

            matched:
              current.matched +
              1,

            needsReview:
              current.needsReview
                .filter(
                  (item) =>
                    reviewCandidateKey(
                      item
                    ) !==
                    key
                ),
          }

        }
      )


      await loadCatalog()

    } catch (reviewError) {

      console.error(
        reviewError
      )


      setError(
        reviewError instanceof
          Error
          ? reviewError.message
          : 'Unable to confirm reviewed match.'
      )

    } finally {

      setConfirmingPath(
        null
      )

    }

  }


  function rejectAutoMatchReview(
    candidate:
      AutoMatchResult['needsReview'][number]
  ) {

    const key =
      reviewCandidateKey(
        candidate
      )


    setMatchResult(
      (current) => {

        if (
          !current
        ) {

          return current

        }


        return {
          ...current,

          needsReview:
            current.needsReview
              .filter(
                (item) =>
                  reviewCandidateKey(
                    item
                  ) !==
                  key
              ),
        }

      }
    )

  }


  async function openMatchReview(
    item: CatalogItem
  ) {

    try {

      setMatchingItem(
        item
      )


      setMatchCandidates(
        []
      )


      setCandidateError(
        ''
      )


      setCandidateLoading(
        true
      )


      const data =
        await fetchCatalogCandidates(
          item.id
        )


      setMatchCandidates(
        data.candidates
      )

    } catch (candidateLoadError) {

      console.error(
        candidateLoadError
      )


      setCandidateError(
        candidateLoadError instanceof
          Error
          ? candidateLoadError.message
          : 'Unable to load file candidates.'
      )

    } finally {

      setCandidateLoading(
        false
      )

    }

  }


  function closeMatchReview() {

    if (
      confirmingPath
    ) {

      return

    }


    setMatchingItem(
      null
    )


    setMatchCandidates(
      []
    )


    setCandidateError(
      ''
    )

  }


  async function openNextUnmatchedRecord(
    currentItemId: number,
    visibleOrder:
      number[]
  ) {

    const query =
      new URLSearchParams(
        filterQueryString.startsWith(
          '?'
        )
          ? filterQueryString.slice(
              1
            )
          : filterQueryString
      )


    /*
     * The next-record workflow always seeks an
     * unmatched item, even when the table itself
     * is currently showing Any File Status.
     */
    query.set(
      'hasFile',
      'false'
    )


    let unmatchedItems:
      CatalogItem[]


    try {

      unmatchedItems =
        await fetchAllCatalogItems(
          `?${query.toString()}`
        )

    } catch {

      setMatchingItem(
        null
      )


      return

    }


    const unmatchedById =
      new Map(
        unmatchedItems.map(
          (item) => [
            item.id,
            item,
          ] as const
        )
      )


    const currentIndex =
      visibleOrder.indexOf(
        currentItemId
      )


    const followingIds =
      currentIndex >=
        0
        ? visibleOrder.slice(
            currentIndex +
            1
          )
        : visibleOrder


    const nextId =
      followingIds.find(
        (id) =>
          unmatchedById.has(
            id
          )
      )


    const nextItem =
      nextId !==
        undefined
        ? (
            unmatchedById.get(
              nextId
            ) ??
            null
          )
        : null


    if (
      !nextItem
    ) {

      setMatchingItem(
        null
      )


      setMatchCandidates(
        []
      )


      return

    }


    const nextVisibleIndex =
      visibleOrder.indexOf(
        nextItem.id
      )


    if (
      nextVisibleIndex >=
      0
    ) {

      setCatalogPage(
        Math.floor(
          nextVisibleIndex /
          CATALOG_PAGE_SIZE
        ) +
        1
      )

    }


    await openMatchReview(
      nextItem
    )

  }



  async function goToNextMatchRecord() {

    if (
      !matchingItem ||
      confirmingPath
    ) {

      return

    }


    let visibleOrder =
      items.map(
        (item) =>
          item.id
      )


    try {

      visibleOrder =
        await fetchAllCatalogItemIds(
          filterQueryString
        )

    } catch {

      /*
       * Fall back to the currently rendered page if
       * the full filtered-order request fails.
       */

    }


    await openNextUnmatchedRecord(
      matchingItem.id,
      visibleOrder
    )

  }


  async function confirmFileMatch(
    candidate:
      MatchCandidate
  ) {

    if (
      !matchingItem
    ) {

      return

    }


    try {

      setConfirmingPath(
        candidate.relativePath
      )


      setCandidateError(
        ''
      )


      let visibleOrder =
        items.map(
          (item) =>
            item.id
        )


      try {

        visibleOrder =
          await fetchAllCatalogItemIds(
            filterQueryString
          )

      } catch {

        /*
         * Keep the current-page order as a safe
         * fallback. The file match itself should not
         * fail merely because the expanded ordering
         * request did.
         */

      }


      await linkCatalogFile(
        matchingItem.id,
        {
          category:
            candidate.category,

          relativePath:
            candidate.relativePath,

          matchMethod:
            'manual',

          confidence:
            candidate.confidence,

          manuallyConfirmed:
            true,
        }
      )


      const matchedItemId =
        matchingItem.id


      await loadCatalog()


      await openNextUnmatchedRecord(
        matchedItemId,
        visibleOrder
      )

    } catch (confirmError) {

      console.error(
        confirmError
      )


      setCandidateError(
        confirmError instanceof
          Error
          ? confirmError.message
          : 'Unable to link file.'
      )

    } finally {

      setConfirmingPath(
        null
      )

    }

  }




  function catalogDisplayName(
    item:
      CatalogItem
  ) {

    const character =
      item.character
        ?.trim()


    if (
      character
    ) {

      const prefix =
        `${character}:`


      if (
        item.canonicalName
          .toLowerCase()
          .startsWith(
            prefix
              .toLowerCase()
          )
      ) {

        return item.canonicalName
          .slice(
            prefix.length
          )
          .trim()

      }

    }


    return item.canonicalName
      .trim()

  }


  async function overrideFileName(
    item:
      CatalogItem
  ) {

    const displayName =
      catalogDisplayName(
        item
      )


    const confirmed =
      window.confirm(
        `Rename this matched file to "${displayName}" while keeping its current file extension?`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setOverrideBusyId(
        item.id
      )


      setOverrideMessage(
        ''
      )


      setOverrideError(
        ''
      )


      const data =
        await overrideCatalogFileName(
          item.id
        )


      const warningText =
        data?.warnings &&
        data.warnings.length >
          0
          ? ` ${data.warnings.join(
              ' '
            )}`
          : ''


      setOverrideMessage(
        data?.changed ===
          false
          ? `File already matches "${data.fileName ?? displayName}".`
          : `Renamed file to "${data?.fileName ?? displayName}".${warningText}`
      )


      await loadCatalog()

    } catch (overrideFailure) {

      console.error(
        overrideFailure
      )


      setOverrideError(
        overrideFailure instanceof
          Error
          ? overrideFailure.message
          : 'Unable to rename the matched archive file.'
      )

    } finally {

      setOverrideBusyId(
        null
      )

    }

  }


  async function toggleRelationships(
    item:
      CatalogItem
  ) {

    if (
      relationshipView
        ?.catalogItemId ===
      item.id
    ) {

      setRelationshipView(
        null
      )


      setRelationshipError(
        ''
      )


      return

    }


    const mode:
      CatalogRelationshipView['mode'] =
      item.category ===
        'Memory'
        ? 'archive-links'
        : 'memories'


    try {

      setRelationshipLoadingId(
        item.id
      )


      setRelationshipError(
        ''
      )


      const relationshipItems =
        await fetchCatalogRelationshipItems(
          item.id,
          mode
        )


      setRelationshipView({
        catalogItemId:
          item.id,

        mode,

        items:
          relationshipItems,
      })

    } catch (loadError) {

      console.error(
        loadError
      )


      setRelationshipError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Unable to load catalog relationships.'
      )

    } finally {

      setRelationshipLoadingId(
        null
      )

    }

  }



  function toggleIncludedCategory(
    category: string
  ) {

    setCatalogPage(
      1
    )


    setIncludedCategories(
      (
        current
      ) => {

        const base =
          current ??
          effectiveIncludedCategories


        if (
          base.includes(
            category
          )
        ) {

          return base.filter(
            (value) =>
              value !==
              category
          )

        }


        return [
          ...base,
          category,
        ]

      }
    )

  }


  function includeAllArchiveCategories() {

    setCatalogPage(
      1
    )


    setIncludedCategories(
      stats?.categories
        .map(
          (entry) =>
            entry.category
        )
        .filter(
          (category) =>
            category !==
            'Memory'
        ) ??
      []
    )

  }


  function changeSearchText(
    value: string
  ) {

    setCatalogPage(
      1
    )


    setSearchText(
      value
    )

  }


  function changeCharacter(
    value: string
  ) {

    setCatalogPage(
      1
    )


    setSelectedCharacter(
      value
    )

  }


  function changeCategory(
    value: string
  ) {

    setCatalogPage(
      1
    )


    setSelectedCategory(
      value
    )

  }


  function changeRarity(
    value: string
  ) {

    setCatalogPage(
      1
    )


    setSelectedRarity(
      value
    )

  }


  function changeFileFilter(
    value: string
  ) {

    setCatalogPage(
      1
    )


    setFileFilter(
      value
    )

  }


  function changeCatalogPage(
    nextPage: number
  ) {

    setCatalogPage(
      Math.min(
        catalogPageCount,
        Math.max(
          1,
          nextPage
        )
      )
    )

  }


  async function runAutoMatch() {

    try {

      setMatching(
        true
      )


      setMatchResult(
        null
      )


      setError(
        ''
      )


      const result =
        await runCatalogAutoMatch(
          effectiveIncludedCategories
        )


      setMatchResult(
        result
      )


      await loadCatalog()

    } catch (matchError) {

      console.error(
        matchError
      )


      setError(
        matchError instanceof
          Error
          ? matchError.message
          : 'Unable to auto-match catalog.'
      )

    } finally {

      setMatching(
        false
      )

    }

  }


  return (

    <main className="archive-page">

      <CatalogPageIntro
        matching={
          matching
        }
        stats={
          stats
        }
        onAutoMatch={() =>
          void runAutoMatch()
        }
      />


      <section className="catalog-page-content">

        <CatalogWikiSyncPanel
          wikiCharacter={
            wikiCharacter
          }
          wikiLoading={
            wikiLoading
          }
          phoneLoading={
            phoneLoading
          }
          wikiPreview={
            wikiPreview
          }
          wikiSyncProgress={
            wikiSyncProgress
          }
          wikiError={
            wikiError
          }
          wikiSyncResult={
            wikiSyncResult
          }
          supplementalSyncResult={
            supplementalSyncResult
          }
          phonePipelineResult={
            phonePipelineResult
          }
          phonePipelineError={
            phonePipelineError
          }
          wikiCacheFreshness={
            wikiCacheFreshness
          }
          wikiCacheLoading={
            wikiCacheLoading
          }
          wikiCacheError={
            wikiCacheError
          }
          setWikiCharacter={
            setWikiCharacter
          }
          setWikiPreview={
            setWikiPreview
          }
          setWikiSyncResult={
            setWikiSyncResult
          }
          setWikiSyncProgress={
            setWikiSyncProgress
          }
          onPreview={() =>
            void previewWikiMemories()
          }
          onSync={() =>
            void syncWikiMemories()
          }
          onPhoneSync={() =>
            void syncPhoneMetadata()
          }
          onRefreshCache={() =>
            void refreshWikiCacheFreshness()
          }
        />


        <CatalogWorkspaceControls
          stats={
            stats
          }
          matchResult={
            matchResult
          }
          confirmingPath={
            confirmingPath
          }
          searchText={
            searchText
          }
          selectedCharacter={
            selectedCharacter
          }
          selectedCategory={
            selectedCategory
          }
          selectedRarity={
            selectedRarity
          }
          fileFilter={
            fileFilter
          }
          characterCategoryCounts={
            characterCategoryCounts
          }
          allCategoriesDisplayCount={
            allCategoriesDisplayCount
          }
          effectiveIncludedCategories={
            effectiveIncludedCategories
          }
          includedCategorySet={
            includedCategorySet
          }
          bulkMatchLoading={
            bulkMatchLoading
          }
          itemCount={
            catalogCount
          }
          onSearchTextChange={
            changeSearchText
          }
          onCharacterChange={
            changeCharacter
          }
          onCategoryChange={
            changeCategory
          }
          onRarityChange={
            changeRarity
          }
          onFileFilterChange={
            changeFileFilter
          }
          onOpenBulkMatch={() =>
            void openBulkMatchView()
          }
          onOpenNewRecord={
            openNewRecord
          }
          onToggleIncludedCategory={
            toggleIncludedCategory
          }
          onIncludeAllArchiveCategories={
            includeAllArchiveCategories
          }
          reviewCandidateKey={
            reviewCandidateKey
          }
          onAcceptReview={(candidate) =>
            void acceptAutoMatchReview(
              candidate
            )
          }
          onRejectReview={
            rejectAutoMatchReview
          }
        />


        <CatalogPagination
          page={
            catalogPage
          }
          pageCount={
            catalogPageCount
          }
          totalCount={
            catalogCount
          }
          rangeStart={
            catalogRangeStart
          }
          rangeEnd={
            catalogRangeEnd
          }
          loading={
            loading
          }
          onPageChange={
            changeCatalogPage
          }
        />


        <CatalogTableSection
          error={
            error
          }
          relationshipError={
            relationshipError
          }
          overrideMessage={
            overrideMessage
          }
          bulkMatchMessage={
            bulkMatchMessage
          }
          overrideError={
            overrideError
          }
          loading={
            loading
          }
          items={
            items
          }
          relationshipView={
            relationshipView
          }
          overrideBusyId={
            overrideBusyId
          }
          relationshipLoadingId={
            relationshipLoadingId
          }
          onOpenMatchReview={(item) =>
            void openMatchReview(
              item
            )
          }
          onOverrideFileName={(item) =>
            void overrideFileName(
              item
            )
          }
          onToggleRelationships={(item) =>
            void toggleRelationships(
              item
            )
          }
          onOpenEditRecord={
            openEditRecord
          }
          onDeleteRecord={(item) =>
            void deleteRecord(
              item
            )
          }
        />


        <CatalogPagination
          page={
            catalogPage
          }
          pageCount={
            catalogPageCount
          }
          totalCount={
            catalogCount
          }
          rangeStart={
            catalogRangeStart
          }
          rangeEnd={
            catalogRangeEnd
          }
          loading={
            loading
          }
          onPageChange={
            changeCatalogPage
          }
        />


      </section>




      <CatalogBulkOverridePanel
        current={
          bulkOverrideCurrent
        }
        loading={
          bulkOverrideLoading
        }
        saving={
          bulkOverrideSaving
        }
        rows={
          bulkOverrideRows
        }
        selections={
          bulkOverrideSelections
        }
        progress={
          bulkOverrideProgress
        }
        error={
          bulkOverrideError
        }
        message={
          bulkOverrideMessage
        }
        onLoad={() =>
          void loadBulkOverridePreview()
        }
        onSetAll={
          setAllBulkOverrideChoices
        }
        onSetChoice={
          setBulkOverrideChoice
        }
        onRun={() =>
          void runBulkOverride()
        }
      />


      <CatalogBulkMatchModal
        open={
          bulkMatchOpen
        }
        loading={
          bulkMatchLoading
        }
        saving={
          bulkMatchSaving
        }
        rows={
          bulkMatchRows
        }
        selections={
          bulkSelections
        }
        error={
          bulkMatchError
        }
        onClose={
          closeBulkMatchView
        }
        onChoose={
          chooseBulkMatch
        }
        onSave={() =>
          void saveBulkMatches()
        }
        optionKey={
          bulkMatchOptionKey
        }
      />


      <CatalogMatchFileModal
        item={
          matchingItem
        }
        candidates={
          matchCandidates
        }
        loading={
          candidateLoading
        }
        error={
          candidateError
        }
        confirmingPath={
          confirmingPath
        }
        onClose={
          closeMatchReview
        }
        onNext={() =>
          void goToNextMatchRecord()
        }
        onConfirm={(candidate) =>
          void confirmFileMatch(
            candidate
          )
        }
      />


      <CatalogEditorModal
        open={
          editorOpen
        }
        editingItem={
          editingItem
        }
        form={
          form
        }
        saveError={
          saveError
        }
        saving={
          saving
        }
        onClose={
          closeEditor
        }
        onUpdateForm={
          updateForm
        }
        onSave={() =>
          void saveRecord()
        }
      />


    </main>

  )

}


export default MetadataCatalogPage