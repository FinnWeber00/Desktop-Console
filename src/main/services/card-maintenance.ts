import type { CardUpdateInput } from '../../shared/types/ipc';
import type { CardRepository } from '../repositories/card-repository';
import { populateCardMetadata } from './card-metadata';

export const repairMissingAppIcons = async (repository: CardRepository): Promise<number> => {
  const cards = repository.list().filter((card) => card.type === 'app');
  let repaired = 0;

  for (const card of cards) {
    const prepared = await populateCardMetadata({
      id: card.id,
      type: card.type,
      name: card.name,
      categoryId: card.categoryId,
      target: card.target,
      note: card.note ?? null,
      icon: null,
      pinned: card.pinned,
    } satisfies CardUpdateInput);

    const changed =
      prepared.name !== card.name ||
      prepared.target !== card.target ||
      (prepared.icon ?? null) !== (card.icon ?? null) ||
      (prepared.note ?? null) !== (card.note ?? null);

    if (!changed) {
      continue;
    }

    const updated = repository.update(prepared);
    if (updated) {
      repaired += 1;
    }
  }

  return repaired;
};
