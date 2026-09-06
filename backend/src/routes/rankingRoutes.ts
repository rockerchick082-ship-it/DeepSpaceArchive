import {
  Router,
} from 'express'

import {
  DatabaseSync,
} from 'node:sqlite'

import {
  applicationDatabasePath,
  ensureApplicationDatabaseMigrations,
} from '../services/databaseMigrations'


ensureApplicationDatabaseMigrations()


const router =
  Router()


const database =
  new DatabaseSync(
    applicationDatabasePath
  )


type RankingVoteRow = {
  category: string
  character: string
  item_a: string
  item_b: string
  winner: string
  created_at: string
  updated_at: string
}


type RankingVote = {
  category: string
  character: string
  itemA: string
  itemB: string
  winner: string
  createdAt: string
  updatedAt: string
}


function normalizeText(
  value: unknown
) {

  return (
    typeof value ===
      'string'
      ? value.trim()
      : ''
  )

}


function canonicalPair(
  first: string,
  second: string
) {

  return first.localeCompare(
    second
  ) <= 0
    ? [
        first,
        second,
      ] as const
    : [
        second,
        first,
      ] as const

}


function rowToVote(
  row: RankingVoteRow
): RankingVote {

  return {
    category:
      row.category,

    character:
      row.character,

    itemA:
      row.item_a,

    itemB:
      row.item_b,

    winner:
      row.winner,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }

}


router.get(
  '/votes',
  (
    request,
    response
  ) => {

    const category =
      normalizeText(
        request.query.category
      )

    const character =
      normalizeText(
        request.query.character
      )


    if (
      !category ||
      !character
    ) {

      return response
        .status(400)
        .json({
          error:
            'category and character are required',
        })

    }


    const rows =
      database
        .prepare(`
          SELECT
            category,
            character,
            item_a,
            item_b,
            winner,
            created_at,
            updated_at
          FROM ranking_vote
          WHERE
            category = ?
            AND character = ?
          ORDER BY
            updated_at ASC,
            id ASC
        `)
        .all(
          category,
          character
        ) as RankingVoteRow[]


    return response.json({
      count:
        rows.length,

      items:
        rows.map(
          rowToVote
        ),
    })

  }
)


router.post(
  '/vote',
  (
    request,
    response
  ) => {

    const category =
      normalizeText(
        request.body?.category
      )

    const character =
      normalizeText(
        request.body?.character
      )

    const first =
      normalizeText(
        request.body?.itemA
      )

    const second =
      normalizeText(
        request.body?.itemB
      )

    const winner =
      normalizeText(
        request.body?.winner
      )


    if (
      !category ||
      !character ||
      !first ||
      !second ||
      !winner
    ) {

      return response
        .status(400)
        .json({
          error:
            'category, character, itemA, itemB, and winner are required',
        })

    }


    if (
      first ===
      second
    ) {

      return response
        .status(400)
        .json({
          error:
            'A ranking comparison requires two different items.',
        })

    }


    if (
      winner !==
        first &&
      winner !==
        second
    ) {

      return response
        .status(400)
        .json({
          error:
            'winner must match itemA or itemB',
        })

    }


    const [
      itemA,
      itemB,
    ] =
      canonicalPair(
        first,
        second
      )


    const now =
      new Date()
        .toISOString()


    database
      .prepare(`
        INSERT INTO ranking_vote (
          category,
          character,
          item_a,
          item_b,
          winner,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (
          category,
          character,
          item_a,
          item_b
        )
        DO UPDATE SET
          winner = excluded.winner,
          updated_at = excluded.updated_at
      `)
      .run(
        category,
        character,
        itemA,
        itemB,
        winner,
        now,
        now
      )


    const row =
      database
        .prepare(`
          SELECT
            category,
            character,
            item_a,
            item_b,
            winner,
            created_at,
            updated_at
          FROM ranking_vote
          WHERE
            category = ?
            AND character = ?
            AND item_a = ?
            AND item_b = ?
        `)
        .get(
          category,
          character,
          itemA,
          itemB
        ) as RankingVoteRow


    return response.json(
      rowToVote(
        row
      )
    )

  }
)


router.delete(
  '/vote',
  (
    request,
    response
  ) => {

    const category =
      normalizeText(
        request.body?.category
      )

    const character =
      normalizeText(
        request.body?.character
      )

    const first =
      normalizeText(
        request.body?.itemA
      )

    const second =
      normalizeText(
        request.body?.itemB
      )


    if (
      !category ||
      !character ||
      !first ||
      !second ||
      first === second
    ) {

      return response
        .status(400)
        .json({
          error:
            'category, character, and two different ranking items are required',
        })

    }


    const [
      itemA,
      itemB,
    ] =
      canonicalPair(
        first,
        second
      )


    const result =
      database
        .prepare(`
          DELETE FROM ranking_vote
          WHERE
            category = ?
            AND character = ?
            AND item_a = ?
            AND item_b = ?
        `)
        .run(
          category,
          character,
          itemA,
          itemB
        )


    return response.json({
      deleted:
        result.changes,
    })

  }
)


router.delete(
  '/votes',
  (
    request,
    response
  ) => {

    const category =
      normalizeText(
        request.query.category
      )

    const character =
      normalizeText(
        request.query.character
      )


    if (
      !category ||
      !character
    ) {

      return response
        .status(400)
        .json({
          error:
            'category and character are required',
        })

    }


    const result =
      database
        .prepare(`
          DELETE FROM ranking_vote
          WHERE
            category = ?
            AND character = ?
        `)
        .run(
          category,
          character
        )


    return response.json({
      deleted:
        result.changes,
    })

  }
)


export default router
