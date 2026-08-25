export type ArchiveStats = {
  totalItemsWithState: number
  totalCompletedWatches: number
  totalWatchSeconds: number
  totalFavorites: number
  averageRating: number | null

  ratingDistribution: {
    rating: number
    count: number
  }[]

  categoryStats: {
    category: string
    completedWatches: number
    watchSeconds: number
    favorites: number
    ratedItems: number
    averageRating: number | null
  }[]
}