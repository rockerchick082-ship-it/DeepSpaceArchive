import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

import {
  thumbnailCacheDirectory,
} from '../config/appPaths'

const thumbnailCache =
  thumbnailCacheDirectory


function createThumbnailId(
  videoPath: string
) {

  return crypto
    .createHash('sha256')
    .update(videoPath)
    .digest('hex')
    .slice(0, 24)

}


export function getThumbnailFileName(
  videoPath: string
) {

  return `${createThumbnailId(videoPath)}.jpg`

}


export function getThumbnailPath(
  videoPath: string
) {

  return path.join(
    thumbnailCache,
    getThumbnailFileName(videoPath)
  )

}


async function fileExists(
  filePath: string
) {

  try {

    await fs.access(filePath)

    return true

  } catch {

    return false

  }

}


export async function ensureThumbnail(
  videoPath: string
) {

  await fs.mkdir(
    thumbnailCache,
    { recursive: true }
  )


  const outputPath =
    getThumbnailPath(videoPath)


  if (
    await fileExists(outputPath)
  ) {

    return outputPath

  }


  await new Promise<void>(
    (resolve, reject) => {

      const ffmpeg =
        spawn(
          'ffmpeg',
          [
            '-ss',
            '00:00:03',
            '-i',
            videoPath,
            '-frames:v',
            '1',
            '-vf',
            'scale=600:-2',
            '-q:v',
            '3',
            '-y',
            outputPath,
          ],
          {
            windowsHide: true,
          }
        )


      let errorOutput = ''


      ffmpeg.stderr.on(
        'data',
        (data) => {

          errorOutput +=
            data.toString()

        }
      )


      ffmpeg.on(
        'error',
        (error) => {

          reject(error)

        }
      )


      ffmpeg.on(
        'close',
        (code) => {

          if (code === 0) {

            resolve()

          } else {

            reject(
              new Error(
                `FFmpeg exited with code ${code}\n${errorOutput}`
              )
            )

          }

        }
      )

    }
  )


  return outputPath

}