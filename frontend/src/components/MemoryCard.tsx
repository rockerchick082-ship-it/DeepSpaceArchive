import { useNavigate } from 'react-router-dom'

import {
  useEffect,
  useState,
} from 'react'

import type {
  Memory,
} from '../data/memoria'


type MemoryCardProps = {
  memory: Memory
  onEdit: (
    memory: Memory
  ) => void
}


function MemoryCard({
  memory,
  onEdit,
}: MemoryCardProps) {

  const navigate =
    useNavigate()


  const customThumbnailUrl =
    memory.thumbnailPath
      ? `/api/custom-thumbnail?${
          new URLSearchParams({
            filePath:
              memory.thumbnailPath,
          })
        }`
      : null


  const [
    generatedThumbnail,
    setGeneratedThumbnail,
  ] =
    useState<{
      filePath: string
      url: string
    } | null>(
      null
    )


  useEffect(() => {

    if (
      customThumbnailUrl ||
      memory.mediaType !==
      'video'
    ) {

      return

    }


    let cancelled =
      false


    async function loadThumbnail() {

      try {

        const query =
          new URLSearchParams({
            filePath:
              memory.filePath,
          })


        const response =
          await fetch(
            `/api/thumbnail?${query}`
          )


        if (!response.ok) {
          return
        }


        const data:
          { thumbnailUrl: string } =
          await response.json()


        if (!cancelled) {

          setGeneratedThumbnail({
            filePath:
              memory.filePath,

            url:
              `${data.thumbnailUrl}`,
          })

        }

      } catch (error) {

        console.error(
          'Unable to load thumbnail:',
          error
        )

      }

    }


    void loadThumbnail()


    return () => {
      cancelled = true
    }

  }, [
    customThumbnailUrl,
    memory.filePath,
    memory.mediaType,
  ])


  const thumbnailUrl =
    customThumbnailUrl ??
    (
      generatedThumbnail?.filePath ===
      memory.filePath
        ? generatedThumbnail.url
        : null
    )


  function openMemory() {

    const query =
      new URLSearchParams({
        file:
          memory.relativePath,
      })


    navigate(
      `/memoria/watch?${query}`
    )

  }


  return (

    <div className="memory-card-wrapper">

      <button
        className="memory-card"
        onClick={openMemory}
      >

        <div className="memory-thumbnail">

          {thumbnailUrl ? (

            <img
              src={thumbnailUrl}
              alt={memory.title}
            />

          ) : (

            <div className="memory-placeholder">
              ▶
            </div>

          )}

        </div>


        <div className="memory-info">

          <h2>
            {memory.title}
          </h2>

          <span>
            {memory.character}
          </span>

        </div>

      </button>


      <button
        className="memory-edit-button"
        onClick={(event) => {

          event.stopPropagation()

          onEdit(memory)

        }}
      >
        Edit
      </button>

    </div>

  )

}


export default MemoryCard