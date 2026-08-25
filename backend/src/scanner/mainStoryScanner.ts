import fs from 'node:fs/promises'
import path from 'node:path'


const videoExtensions =
  new Set([
    '.mp4',
    '.mkv',
    '.webm',
    '.mov',
    '.avi',
  ])


type MainStoryMetadata = {

  displayTitle?:
    string

  sortOrder?:
    number

  releaseDate?:
    string

  thumbnail?:
    string

}


export type MainStoryPart = {

  id:
    string

  title:
    string

  order:
    number

  fileName:
    string

  filePath:
    string

  relativePath:
    string

  releaseDate:
    string | null

  thumbnailPath:
    string | null

}


export type MainStoryChapter = {

  id:
    string

  title:
    string

  order:
    number

  folderName:
    string

  relativePath:
    string

  parts:
    MainStoryPart[]

  partCount:
    number

}


export type MainStoryBranch = {

  id:
    string

  title:
    string

  order:
    number

  folderName:
    string

  relativePath:
    string

  chapters:
    MainStoryChapter[]

  chapterCount:
    number

  partCount:
    number

}


/*
 * ========================================
 * PATH HELPERS
 * ========================================
 */

function normalizeRelativePath(
  value: string
) {

  return value
    .split(
      path.sep
    )
    .join('/')

}


function createId(
  relativePath: string
) {

  return normalizeRelativePath(
    relativePath
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    )

}


/*
 * ========================================
 * FOLDER NAME PARSING
 * ========================================
 *
 * This is used for BRANCH and CHAPTER
 * folders, where names such as:
 *
 * 01. Under Deepspace
 * 01. To Begin
 *
 * really do contain their intended order.
 *
 * Importantly, this no longer returns
 * Number.MAX_SAFE_INTEGER.
 * ========================================
 */

function parseFolderName(
  value: string,
  fallbackOrder: number
) {

  const name =
    value.trim()


  const match =
    name.match(
      /^\s*(\d+)\s*[.\-_ ]+\s*(.+)$/
    )


  if (
    !match
  ) {

    return {

      order:
        fallbackOrder,

      title:
        name,

    }

  }


  return {

    order:
      Number(
        match[1]
      ),

    title:
      match[2]
        .trim(),

  }

}


/*
 * ========================================
 * SIDECAR METADATA
 * ========================================
 *
 * Video:
 *
 * Main Story ... .mp4
 *
 * Sidecar:
 *
 * Main Story ... .json
 *
 * Supported:
 *
 * displayTitle
 * sortOrder
 * releaseDate
 * thumbnailPath
 * ========================================
 */

async function readPartMetadata(
  videoPath: string
): Promise<MainStoryMetadata | null> {

  const parsed =
    path.parse(
      videoPath
    )


  const sidecarPath =
    path.join(
      parsed.dir,
      `${parsed.name}.json`
    )


  try {

    const contents =
      await fs.readFile(
        sidecarPath,
        'utf8'
      )


    const metadata =
      JSON.parse(
        contents
      ) as MainStoryMetadata


    return metadata

  } catch {

    return null

  }

}


/*
 * ========================================
 * RAW TITLE FALLBACK
 * ========================================
 *
 * Your files currently look like:
 *
 * Main Story ： Under Deepspace Chapter 1.
 * To Begin ｜ Ultra quality ｜ 4K ｜
 * Love and Deepspace
 *
 * That filename does NOT contain the
 * actual story-part title.
 *
 * So instead of displaying that enormous
 * raw download name, a file with no custom
 * displayTitle becomes:
 *
 * Story Part 1
 * Story Part 2
 * ...
 *
 * Once a sidecar contains displayTitle,
 * that title replaces this automatically.
 * ========================================
 */

function createFallbackPartTitle(
  index: number
) {

  return (
    `Story Part ${index + 1}`
  )

}


/*
 * ========================================
 * SCAN CHAPTER
 * ========================================
 */

async function scanChapter(
  chapterPath: string,
  storyRoot: string,
  chapterFallbackOrder: number
): Promise<MainStoryChapter> {

  const folderName =
    path.basename(
      chapterPath
    )


  const chapterInfo =
    parseFolderName(
      folderName,
      chapterFallbackOrder
    )


  const entries =
    await fs.readdir(
      chapterPath,
      {
        withFileTypes: true,
      }
    )


  /*
   * Keep temporary information while
   * determining final order.
   */

  const temporaryParts:
    {
      id: string
      fileName: string
      filePath: string
      relativePath: string

      metadata:
        MainStoryMetadata | null

      explicitOrder:
        number | null
    }[] =
    []


  for (
    const entry
    of entries
  ) {

    if (
      !entry.isFile()
    ) {

      continue

    }


    const extension =
      path.extname(
        entry.name
      )
        .toLowerCase()


    if (
      !videoExtensions.has(
        extension
      )
    ) {

      continue

    }


    const fullPath =
      path.join(
        chapterPath,
        entry.name
      )


    const relativePath =
      normalizeRelativePath(
        path.relative(
          storyRoot,
          fullPath
        )
      )


    const metadata =
      await readPartMetadata(
        fullPath
      )


    let explicitOrder:
      number | null =
      null


    /*
     * Sidecar sortOrder has highest
     * priority.
     */

    if (
      typeof metadata?.sortOrder ===
        'number' &&
      Number.isFinite(
        metadata.sortOrder
      )
    ) {

      explicitOrder =
        metadata.sortOrder

    } else {

      /*
       * We ONLY recognize a filename
       * number when it clearly begins
       * with something such as:
       *
       * 00. Singularity Echo.mp4
       * 01 - Deepspace Hunter.mp4
       *
       * Your YouTube filename begins
       * with "Main Story", therefore
       * this will NOT parse it as an
       * order.
       */

      const baseName =
        path.parse(
          entry.name
        ).name


      const orderMatch =
        baseName.match(
          /^\s*(\d+)\s*[.\-_ ]+\s*/
        )


      if (
        orderMatch
      ) {

        explicitOrder =
          Number(
            orderMatch[1]
          )

      }

    }


    temporaryParts.push({

      id:
        createId(
          relativePath
        ),

      fileName:
        entry.name,

      filePath:
        fullPath,

      relativePath,

      metadata,

      explicitOrder,

    })

  }


  /*
   * =====================================
   * SORT PARTS
   * =====================================
   *
   * 1. Explicit sortOrder first.
   * 2. Then filename if no sortOrder.
   *
   * No MAX_SAFE_INTEGER is ever exposed
   * to the frontend.
   */

  temporaryParts.sort(
    (
      a,
      b
    ) => {

      const aHasOrder =
        a.explicitOrder !==
        null


      const bHasOrder =
        b.explicitOrder !==
        null


      if (
        aHasOrder &&
        bHasOrder
      ) {

        const difference =
          (
            a.explicitOrder ??
            0
          ) -
          (
            b.explicitOrder ??
            0
          )


        if (
          difference !==
          0
        ) {

          return difference

        }

      }


      if (
        aHasOrder &&
        !bHasOrder
      ) {

        return -1

      }


      if (
        !aHasOrder &&
        bHasOrder
      ) {

        return 1

      }


      return a.fileName
        .localeCompare(
          b.fileName,
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        )

    }
  )


  /*
   * =====================================
   * CREATE FINAL PARTS
   * =====================================
   */

  const parts:
    MainStoryPart[] =
    temporaryParts.map(
      (
        part,
        index
      ) => {

        const metadataTitle =
          part.metadata
            ?.displayTitle
            ?.trim()


        /*
         * If no explicit sortOrder exists,
         * use the final sequential position.
         *
         * This prevents the old
         * 9007199254740991 problem.
         */

        const order =
          part.explicitOrder ??
          index


        let thumbnailPath:
          string | null =
          null


       if (
  part.metadata
    ?.thumbnail
) {

  thumbnailPath =
    path.join(
      path.dirname(
        part.filePath
      ),
      part.metadata
        .thumbnail
    )

}

        return {

          id:
            part.id,

          title:
            metadataTitle ||
            createFallbackPartTitle(
              index
            ),

          order,

          fileName:
            part.fileName,

          filePath:
            part.filePath,

          relativePath:
            part.relativePath,

          releaseDate:
            part.metadata
              ?.releaseDate ??
            null,

          thumbnailPath,

        }

      }
    )


  const relativePath =
    normalizeRelativePath(
      path.relative(
        storyRoot,
        chapterPath
      )
    )


  return {

    id:
      createId(
        relativePath
      ),

    title:
      chapterInfo.title,

    order:
      chapterInfo.order,

    folderName,

    relativePath,

    parts,

    partCount:
      parts.length,

  }

}


/*
 * ========================================
 * SCAN STORY BRANCH
 * ========================================
 */

async function scanBranch(
  branchPath: string,
  storyRoot: string,
  branchFallbackOrder: number
): Promise<MainStoryBranch> {

  const folderName =
    path.basename(
      branchPath
    )


  const branchInfo =
    parseFolderName(
      folderName,
      branchFallbackOrder
    )


  const entries =
    await fs.readdir(
      branchPath,
      {
        withFileTypes: true,
      }
    )


  const chapterDirectories =
    entries
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .sort(
        (
          a,
          b
        ) =>
          a.name.localeCompare(
            b.name,
            undefined,
            {
              numeric: true,
              sensitivity: 'base',
            }
          )
      )


  const chapters:
    MainStoryChapter[] =
    []


  for (
    let index = 0;
    index <
    chapterDirectories.length;
    index += 1
  ) {

    const entry =
      chapterDirectories[
        index
      ]


    const chapter =
      await scanChapter(

        path.join(
          branchPath,
          entry.name
        ),

        storyRoot,

        index + 1

      )


    chapters.push(
      chapter
    )

  }


  chapters.sort(
    (
      a,
      b
    ) => {

      if (
        a.order !==
        b.order
      ) {

        return (
          a.order -
          b.order
        )

      }


      return a.title
        .localeCompare(
          b.title,
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        )

    }
  )


  const relativePath =
    normalizeRelativePath(
      path.relative(
        storyRoot,
        branchPath
      )
    )


  return {

    id:
      createId(
        relativePath
      ),

    title:
      branchInfo.title,

    order:
      branchInfo.order,

    folderName,

    relativePath,

    chapters,

    chapterCount:
      chapters.length,

    partCount:
      chapters.reduce(
        (
          total,
          chapter
        ) =>
          total +
          chapter.partCount,
        0
      ),

  }

}


/*
 * ========================================
 * SCAN MAIN STORY
 * ========================================
 */

async function scanMainStory(
  libraryRoot: string
): Promise<MainStoryBranch[]> {

  const storyRoot =
    path.join(
      libraryRoot,
      'Main Story'
    )


  const entries =
    await fs.readdir(
      storyRoot,
      {
        withFileTypes: true,
      }
    )


  const branchDirectories =
    entries
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .sort(
        (
          a,
          b
        ) =>
          a.name.localeCompare(
            b.name,
            undefined,
            {
              numeric: true,
              sensitivity: 'base',
            }
          )
      )


  const branches:
    MainStoryBranch[] =
    []


  for (
    let index = 0;
    index <
    branchDirectories.length;
    index += 1
  ) {

    const entry =
      branchDirectories[
        index
      ]


    const branch =
      await scanBranch(

        path.join(
          storyRoot,
          entry.name
        ),

        storyRoot,

        index + 1

      )


    branches.push(
      branch
    )

  }


  branches.sort(
    (
      a,
      b
    ) => {

      if (
        a.order !==
        b.order
      ) {

        return (
          a.order -
          b.order
        )

      }


      return a.title
        .localeCompare(
          b.title,
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        )

    }
  )


  return branches

}


export {
  scanMainStory,
}