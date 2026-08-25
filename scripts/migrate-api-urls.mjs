import fs from 'node:fs'
import path from 'node:path'


const projectRoot =
  process.cwd()


const sourceRoot =
  path.join(
    projectRoot,
    'frontend',
    'src'
  )


const extensions =
  new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
  ])


const oldOrigin =
  'http://localhost:3001'


let filesChanged =
  0


let replacements =
  0


function walk(
  directory
) {

  for (
    const entry
    of fs.readdirSync(
      directory,
      {
        withFileTypes:
          true,
      }
    )
  ) {

    const fullPath =
      path.join(
        directory,
        entry.name
      )


    if (
      entry.isDirectory()
    ) {

      walk(
        fullPath
      )


      continue

    }


    if (
      !entry.isFile() ||
      !extensions.has(
        path.extname(
          entry.name
        )
      )
    ) {

      continue

    }


    const original =
      fs.readFileSync(
        fullPath,
        'utf8'
      )


    const occurrences =
      original
        .split(
          oldOrigin
        )
        .length -
      1


    if (
      occurrences ===
      0
    ) {

      continue

    }


    const updated =
      original
        .split(
          oldOrigin
        )
        .join(
          ''
        )


    fs.writeFileSync(
      fullPath,
      updated,
      'utf8'
    )


    filesChanged +=
      1


    replacements +=
      occurrences


    console.log(
      `${path.relative(
        projectRoot,
        fullPath
      )}: ${occurrences}`
    )

  }

}


if (
  !fs.existsSync(
    sourceRoot
  )
) {

  console.error(
    'frontend/src was not found. Run this script from the DeepSpaceArchive project root.'
  )


  process.exit(
    1
  )

}


walk(
  sourceRoot
)


console.log(
  ''
)


console.log(
  `Changed ${filesChanged} files and removed ${replacements} hardcoded localhost API origins.`
)


console.log(
  'Frontend API requests are now same-origin (/api/...).'
)
