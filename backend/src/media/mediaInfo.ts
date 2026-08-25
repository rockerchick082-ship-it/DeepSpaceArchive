import { spawn } from 'node:child_process'


export type VideoInfo = {
  width: number | null
  height: number | null
  resolutionLabel: string
  duration: number | null
  codec: string | null
  frameRate: string | null
}


function getResolutionLabel(
  width: number,
  height: number
) {

  const longSide =
    Math.max(
      width,
      height
    )

  const shortSide =
    Math.min(
      width,
      height
    )


  if (
    longSide >= 3800 ||
    shortSide >= 2100
  ) {

    return '4K'

  }


  if (
    longSide >= 2500 ||
    shortSide >= 1400
  ) {

    return '1440p'

  }


  if (
    longSide >= 1900 ||
    shortSide >= 1000
  ) {

    return '1080p'

  }


  if (
    longSide >= 1200 ||
    shortSide >= 700
  ) {

    return '720p'

  }


  if (
    longSide >= 800 ||
    shortSide >= 450
  ) {

    return '480p'

  }


  return `${width}×${height}`

}


export async function getVideoInfo(
  filePath: string
): Promise<VideoInfo> {

  return new Promise(
    (resolve, reject) => {

      const ffprobe =
        spawn(
          'ffprobe',
          [
            '-v',
            'quiet',

            '-print_format',
            'json',

            '-show_streams',

            '-show_format',

            filePath,
          ],
          {
            windowsHide: true,
          }
        )


      let output = ''

      let errorOutput = ''


      ffprobe.stdout.on(
        'data',
        (data) => {

          output +=
            data.toString()

        }
      )


      ffprobe.stderr.on(
        'data',
        (data) => {

          errorOutput +=
            data.toString()

        }
      )


      ffprobe.on(
        'error',
        reject
      )


      ffprobe.on(
        'close',
        (code) => {

          if (code !== 0) {

            reject(
              new Error(
                `ffprobe exited with code ${code}: ${errorOutput}`
              )
            )

            return

          }


          const data =
            JSON.parse(
              output
            )


          const videoStream =
            data.streams?.find(
              (
                stream:
                {
                  codec_type?: string
                }
              ) =>
                stream.codec_type ===
                'video'
            )


          const width =
            Number(
              videoStream?.width
            ) || null


          const height =
            Number(
              videoStream?.height
            ) || null


          const duration =
            Number(
              data.format?.duration
            ) || null


          const codec =
            videoStream?.codec_name ??
            null


          const frameRate =
            videoStream?.avg_frame_rate ??
            null


          resolve({

            width,

            height,

            resolutionLabel:
              width && height
                ? getResolutionLabel(
                    width,
                    height
                  )
                : 'Unknown',

            duration,

            codec,

            frameRate,

          })

        }

      )

    }
  )

}