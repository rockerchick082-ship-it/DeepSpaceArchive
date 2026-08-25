export type Memory = {
  title: string
  character: string
  category: string
  fileName: string
  filePath: string
  relativePath: string
  mediaType: 'video' | 'audio' | 'image' | 'other'
  sortOrder: number | null
  releaseDate: string | null
  thumbnailPath: string | null
  image?: string
}