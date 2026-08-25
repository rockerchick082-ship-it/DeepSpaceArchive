import {
  Link,
} from 'react-router-dom'

import ArchiveNavigationSettings
  from '../components/ArchiveNavigationSettings'


type SettingsCard = {
  to: string
  icon: string
  title: string
  description: string
  tag?: string
}


type SettingsGroup = {
  eyebrow: string
  title: string
  description: string
  cards: SettingsCard[]
}


const settingsGroups:
  SettingsGroup[] = [
    {
      eyebrow:
        'LIBRARY',

      title:
        'Media Library',

      description:
        'Configure where DeepSpace Archive reads media and check what the application can currently see.',

      cards: [
        {
          to:
            '/settings/library',

          icon:
            '▣',

          title:
            'Library Status',

          description:
            'View your media library connection, archive counts, characters, and detected media.',

          tag:
            'STATUS',
        },

        {
          to:
            '/settings/file-locations',

          icon:
            '⌘',

          title:
            'File Locations',

          description:
            'Change the media library root, test path access, and inspect detected archive folders.',

          tag:
            'PATHS',
        },
      ],
    },

    {
      eyebrow:
        'METADATA',

      title:
        'Metadata & Artwork',

      description:
        'Manage catalog records, source data, custom metadata, artwork coverage, and generated thumbnails.',

      cards: [
        {
          to:
            '/settings/catalog',

          icon:
            '⌕',

          title:
            'Metadata Catalog',

          description:
            'Search and maintain canonical game metadata, artwork, release information, and wiki-synced records.',

          tag:
            'CATALOG',
        },

        {
          to:
            '/settings/metadata',

          icon:
            '◇',

          title:
            'Metadata Health',

          description:
            'Check sidecars, custom artwork, missing metadata, invalid files, and orphaned archive data.',

          tag:
            'HEALTH',
        },

        {
          to:
            '/settings/gallery-wiki',

          icon:
            '◎',

          title:
            'Gallery Wiki Sources',

          description:
            'Manage the character wiki pages used when syncing Memory artwork into the Gallery.',

          tag:
            'SOURCES',
        },

        {
          to:
            '/settings/thumbnails',

          icon:
            '▧',

          title:
            'Thumbnails & Cache',

          description:
            'Inspect generated thumbnails, custom artwork, cache size, and safely clear temporary images.',

          tag:
            'CACHE',
        },
      ],
    },

    {
      eyebrow:
        'MAINTENANCE',

      title:
        'Protection & Maintenance',

      description:
        'Protect archive state and maintain the application database without touching your source media files.',

      cards: [
        {
          to:
            '/backup',

          icon:
            '↻',

          title:
            'Backup & Restore',

          description:
            'Protect ratings, favorites, watch history, playlists, metadata, and custom artwork.',

          tag:
            'BACKUP',
        },

        {
          to:
            '/settings/database',

          icon:
            '◫',

          title:
            'Database Maintenance',

          description:
            'Check database health, inspect stored records, create safety snapshots, and optimize SQLite.',

          tag:
            'DATABASE',
        },
      ],
    },

    {
      eyebrow:
        'SYSTEM',

      title:
        'Application',

      description:
        'Review application and runtime information, then configure archive navigation behavior.',

      cards: [
        {
          to:
            '/settings/about',

          icon:
            'i',

          title:
            'About DeepSpace Archive',

          description:
            'View application version, runtime information, FFmpeg, storage paths, and system status.',

          tag:
            'SYSTEM',
        },
      ],
    },
  ]


function SettingsPage() {

  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            DEEPSPACE ARCHIVE
          </span>


          <h1>
            Settings
          </h1>

        </div>

      </header>


      <section className="settings-page-content settings-dashboard">

        <div className="settings-dashboard-intro">

          <span className="archive-eyebrow">
            ARCHIVE MANAGEMENT
          </span>


          <h2>
            Manage DeepSpace Archive
          </h2>


          <p>
            Library configuration, metadata,
            maintenance, backups, and system
            information are grouped below by
            purpose.
          </p>

        </div>


        <div className="settings-dashboard-groups">

          {settingsGroups.map(
            (group) => (

              <section
                className="settings-dashboard-group"
                key={
                  group.title
                }
              >

                <div className="settings-dashboard-group-heading">

                  <div>

                    <span className="archive-eyebrow">
                      {group.eyebrow}
                    </span>


                    <h2>
                      {group.title}
                    </h2>


                    <p>
                      {group.description}
                    </p>

                  </div>


                  <span className="settings-dashboard-group-count">

                    {group.cards.length}

                    {' '}

                    {group.cards.length ===
                    1
                      ? 'tool'
                      : 'tools'}

                  </span>

                </div>


                <div className="settings-dashboard-grid">

                  {group.cards.map(
                    (card) => (

                      <Link
                        key={
                          card.to
                        }
                        to={
                          card.to
                        }
                        className="settings-card settings-dashboard-card"
                      >

                        <div className="settings-card-icon">
                          {card.icon}
                        </div>


                        <div className="settings-card-content">

                          <div className="settings-dashboard-card-title">

                            <h3>
                              {card.title}
                            </h3>


                            {card.tag && (

                              <span>
                                {card.tag}
                              </span>

                            )}

                          </div>


                          <p>
                            {card.description}
                          </p>

                        </div>


                        <span className="settings-card-arrow">
                          ›
                        </span>

                      </Link>

                    )
                  )}

                </div>

              </section>

            )
          )}

        </div>


        <section className="settings-navigation-section">

          <div className="settings-dashboard-group-heading">

            <div>

              <span className="archive-eyebrow">
                NAVIGATION
              </span>


              <h2>
                Archive Navigation
              </h2>


              <p>
                Configure playback and archive
                navigation behavior separately from
                maintenance tools.
              </p>

            </div>

          </div>


          <ArchiveNavigationSettings />

        </section>

      </section>

    </main>

  )

}


export default SettingsPage