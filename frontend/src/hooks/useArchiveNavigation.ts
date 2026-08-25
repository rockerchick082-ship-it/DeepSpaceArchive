import {
  useCallback,
  useState,
} from 'react'

import {
  archiveNavigationStorageKey,
  defaultArchiveNavigation,
} from '../data/archiveNavigation'

import type {
  ArchiveNavigationItem,
} from '../data/archiveNavigation'


function cloneDefaults() {

  return defaultArchiveNavigation.map(
    (item) => ({
      ...item,
    })
  )

}


function loadNavigation():
  ArchiveNavigationItem[] {

  try {

    const stored =
      localStorage.getItem(
        archiveNavigationStorageKey
      )


    if (!stored) {

      return cloneDefaults()

    }


    const parsed =
      JSON.parse(
        stored
      )


    if (
      !Array.isArray(
        parsed
      )
    ) {

      return cloneDefaults()

    }


    const savedItems =
      parsed as ArchiveNavigationItem[]


    const result:
      ArchiveNavigationItem[] =
      []


    /*
     * Preserve saved order.
     */

    for (
      const savedItem
      of savedItems
    ) {

      const defaultItem =
        defaultArchiveNavigation.find(
          (item) =>
            item.id ===
            savedItem.id
        )


      if (
        !defaultItem
      ) {

        continue

      }


      result.push({

        ...defaultItem,

        enabled:
          savedItem.enabled !==
          false,

      })

    }


    /*
     * Add any sections introduced
     * in a future app update.
     */

    for (
      const defaultItem
      of defaultArchiveNavigation
    ) {

      const alreadyIncluded =
        result.some(
          (item) =>
            item.id ===
            defaultItem.id
        )


      if (
        !alreadyIncluded
      ) {

        result.push({
          ...defaultItem,
        })

      }

    }


    return result

  } catch (error) {

    console.error(
      'Unable to load archive navigation settings:',
      error
    )


    return cloneDefaults()

  }

}


function saveNavigation(
  navigation:
    ArchiveNavigationItem[]
) {

  try {

    localStorage.setItem(
      archiveNavigationStorageKey,
      JSON.stringify(
        navigation
      )
    )

  } catch (error) {

    console.error(
      'Unable to save archive navigation settings:',
      error
    )

  }

}


export function useArchiveNavigation() {

  const [
    navigation,
    setNavigationState,
  ] =
    useState<
      ArchiveNavigationItem[]
    >(
      loadNavigation
    )


  const setNavigation =
    useCallback(
      (
        next:
          ArchiveNavigationItem[]
      ) => {

        setNavigationState(
          next
        )


        saveNavigation(
          next
        )

      },
      []
    )


  const toggleNavigation =
    useCallback(
      (
        id:
          ArchiveNavigationItem['id']
      ) => {

        setNavigationState(
          (current) => {

            const next =
              current.map(
                (item) =>
                  item.id ===
                  id
                    ? {
                        ...item,
                        enabled:
                          !item.enabled,
                      }
                    : item
              )


            saveNavigation(
              next
            )


            return next

          }
        )

      },
      []
    )


  const moveNavigation =
    useCallback(
      (
        id:
          ArchiveNavigationItem['id'],

        direction:
          'up' |
          'down'
      ) => {

        setNavigationState(
          (current) => {

            const currentIndex =
              current.findIndex(
                (item) =>
                  item.id ===
                  id
              )


            if (
              currentIndex <
              0
            ) {

              return current

            }


            const targetIndex =
              direction ===
              'up'
                ? currentIndex - 1
                : currentIndex + 1


            if (
              targetIndex <
                0 ||
              targetIndex >=
                current.length
            ) {

              return current

            }


            const next =
              [
                ...current,
              ]


            const movedItem =
              next[
                currentIndex
              ]


            next[
              currentIndex
            ] =
              next[
                targetIndex
              ]


            next[
              targetIndex
            ] =
              movedItem


            saveNavigation(
              next
            )


            return next

          }
        )

      },
      []
    )


  const resetNavigation =
    useCallback(
      () => {

        const defaults =
          cloneDefaults()


        setNavigation(
          defaults
        )

      },
      [
        setNavigation,
      ]
    )


  return {

    navigation,

    enabledNavigation:
      navigation.filter(
        (item) =>
          item.enabled
      ),

    toggleNavigation,

    moveNavigation,

    resetNavigation,

  }

}