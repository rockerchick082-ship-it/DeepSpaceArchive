export type ArchiveNavigationId =
  | 'memoria'
  | 'secret-times'
  | 'tender-moments'
  | 'myths'
  | 'bond'
  | 'gallery'
  | 'main-story'
  | 'phone'
  | 'illusio'


export type ArchiveNavigationItem = {
  id: ArchiveNavigationId
  title: string
  icon: string
  path: string
  enabled: boolean
}


export const defaultArchiveNavigation:
  ArchiveNavigationItem[] = [

  {
    id: 'memoria',
    title: 'Memoria',
    icon: '◇',
    path: '/memoria',
    enabled: true,
  },

  {
    id: 'secret-times',
    title: 'Secret Times',
    icon: '♫',
    path: '/secret-times',
    enabled: true,
  },

  {
    id: 'tender-moments',
    title: 'Tender Moments',
    icon: '♡',
    path: '/tender-moments',
    enabled: true,
  },

  {
    id: 'myths',
    title: 'Myths',
    icon: '✦',
    path: '/myths',
    enabled: true,
  },

  {
    id: 'bond',
    title: 'Bond',
    icon: '◈',
    path: '/bond',
    enabled: true,
  },

  {
    id: 'gallery',
    title: 'Gallery',
    icon: '▣',
    path: '/gallery',
    enabled: true,
  },

  {
    id: 'main-story',
    title: 'Main Story',
    icon: '▤',
    path: '/main-story',
    enabled: true,
  },

  {
    id: 'phone',
    title: 'Phone',
    icon: '☎',
    path: '/phone',
    enabled: true,
  },

  {
    id: 'illusio',
    title: 'Illusio',
    icon: '✧',
    path: '/illusio',
    enabled: true,
  },

]


export const archiveNavigationStorageKey =
  'deepspace-archive-home-navigation'