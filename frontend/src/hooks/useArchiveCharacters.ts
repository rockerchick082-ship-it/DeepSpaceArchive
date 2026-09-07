import { useEffect, useState } from 'react'

export const DEFAULT_ARCHIVE_CHARACTERS = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]

type CharacterResponse = {
  count: number
  characters: Array<{ name: string }>
}

export function useArchiveCharacters() {
  const [characters, setCharacters] = useState<string[]>(DEFAULT_ARCHIVE_CHARACTERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/library/characters')
        if (!response.ok) throw new Error('Unable to load archive characters.')
        const data = await response.json() as CharacterResponse
        const names = data.characters
          .map((entry) => entry.name.trim())
          .filter(Boolean)

        if (!cancelled && names.length > 0) setCharacters(names)
      } catch (error) {
        console.warn('Unable to load archive characters; using defaults.', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  return { characters, loading }
}
