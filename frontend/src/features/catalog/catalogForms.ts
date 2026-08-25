import type {
  CatalogForm,
  CatalogItem,
} from './catalogTypes'


export const blankForm:
  CatalogForm = {

  canonicalName:
    '',

  character:
    '',

  category:
    '',

  subcategory:
    '',

  releaseDate:
    '',

  rarity:
    '',

  position:
    '',

  attribute:
    '',

  source:
    '',

  imageUrl:
    '',

  sourceName:
    'manual',

  sourceUrl:
    '',

  sourceKey:
    '',

  sourceUpdatedAt:
    '',

  manualNotes:
    '',
}


export function nullableText(
  value: string
) {

  const trimmed =
    value.trim()


  return (
    trimmed ||
    null
  )

}


export function itemToForm(
  item: CatalogItem
): CatalogForm {

  return {
    canonicalName:
      item.canonicalName,

    character:
      item.character ??
      '',

    category:
      item.category,

    subcategory:
      item.subcategory ??
      '',

    releaseDate:
      item.releaseDate ??
      '',

    rarity:
      item.rarity ===
        null
        ? ''
        : String(
            item.rarity
          ),

    position:
      item.position ??
      '',

    attribute:
      item.attribute ??
      '',

    source:
      item.source ??
      '',

    imageUrl:
      item.imageUrl ??
      '',

    sourceName:
      item.sourceName ??
      '',

    sourceUrl:
      item.sourceUrl ??
      '',

    sourceKey:
      item.sourceKey ??
      '',

    sourceUpdatedAt:
      item.sourceUpdatedAt ??
      '',

    manualNotes:
      item.manualNotes ??
      '',
  }

}
