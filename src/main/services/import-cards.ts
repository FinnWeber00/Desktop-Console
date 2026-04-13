import fs from 'node:fs';
import path from 'node:path';

import type { Card } from '../../shared/types/models';
import type { CardCreateInput, CardImportInput } from '../../shared/types/ipc';
import type { CardRepository } from '../repositories/card-repository';
import {
  deriveWebsiteName,
  normalizeAppTarget,
  normalizeWebsiteTarget,
  populateCardMetadata,
} from './card-metadata';

type ImportCandidate =
  | { type: 'website'; name: string; target: string }
  | { type: 'app'; name: string; target: string };

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseInternetShortcut = (filePath: string): string | null => {
  const normalizedPath = normalizeAppTarget(filePath);
  if (path.extname(normalizedPath).toLowerCase() !== '.url') {
    return null;
  }

  try {
    const content = fs.readFileSync(normalizedPath, 'utf8');
    const match = content.match(/^URL=(.+)$/im);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
};

const buildWebsiteCandidate = (value: string): ImportCandidate | null => {
  const normalized = normalizeWebsiteTarget(value);
  if (!normalized || !isHttpUrl(normalized)) {
    return null;
  }

  const url = new URL(normalized);
  return {
    type: 'website',
    name: deriveWebsiteName(url.toString()),
    target: url.toString(),
  };
};

const buildAppCandidate = (rawValue: string): ImportCandidate | null => {
  const filePath = normalizeAppTarget(rawValue);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    return null;
  }

  return {
    type: 'app',
    name: path.basename(filePath, path.extname(filePath)) || path.basename(filePath),
    target: filePath,
  };
};

const buildCandidate = (raw: string): ImportCandidate | null => {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const shortcutUrl = parseInternetShortcut(value);
  if (shortcutUrl) {
    return buildWebsiteCandidate(shortcutUrl);
  }

  return buildWebsiteCandidate(value) ?? buildAppCandidate(value);
};

const toCreateInput = async (candidate: ImportCandidate, categoryId: string): Promise<CardCreateInput> =>
  populateCardMetadata({
    type: candidate.type,
    name: candidate.name,
    categoryId,
    target: candidate.target,
    note: null,
    icon: null,
  });

export const importCardsFromResources = async (
  repository: CardRepository,
  input: CardImportInput,
): Promise<Card[]> => {
  const created: Card[] = [];
  const seen = new Set<string>();

  for (const raw of input.items) {
    const candidate = buildCandidate(raw);
    if (!candidate) {
      continue;
    }

    const dedupeKey = `${candidate.type}:${candidate.target.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    created.push(repository.create(await toCreateInput(candidate, input.categoryId)));
  }

  return created;
};
