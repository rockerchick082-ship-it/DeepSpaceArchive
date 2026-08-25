import { useState } from 'react'

const characters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]

type CharacterSelectorProps = {
  selectedCharacter: string
  onCharacterChange: (character: string) => void
}

function CharacterSelector({
  selectedCharacter,
  onCharacterChange,
}: CharacterSelectorProps) {
  const [isOpen, setIsOpen] =
    useState(false)

  function chooseCharacter(character: string) {
    onCharacterChange(character)
    setIsOpen(false)
  }

  return (
    <div className="character-selector">

      <button
        className="character-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedCharacter}

        <span className="character-arrow">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="character-menu">

          {characters.map((character) => (
            <button
              key={character}
              className="character-option"
              onClick={() =>
                chooseCharacter(character)
              }
            >
              {character}
            </button>
          ))}

        </div>
      )}

    </div>
  )
}

export default CharacterSelector