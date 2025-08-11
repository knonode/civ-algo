// Shared icon mapping and helpers for settlement types

// Normalize backend type_site strings to our mapping keys
export function normalizeTypeKey(typeSite: string): string {
  const raw = (typeSite || 'settlement').replace('.svg', '').toLowerCase();
  return raw;
}

// Map type_site values (normalized) to icon filenames under /public/icons
const ICON_TYPE_TO_FILENAME: Record<string, string> = {
  'cave': 'cave.svg',
  'burial': 'burial.svg',
  'mummies': 'mummies.svg',
  'artifact': 'artifact.svg',
  'lake': 'lake.svg',
  'hills': 'hills.svg',
  'coast': 'coast.svg',
  'river': 'river.svg',
  'formation': 'formation.svg',
  'thermal': 'thermal spring.svg',
  'thermal spring': 'thermal spring.svg',
  'thermal-spring': 'thermal spring.svg',
  'dna': 'dna.svg',
  'settlement': 'settlement.svg',
  'colony': 'colony.svg',
  'castaway': 'castaway.svg',
  'pirate': 'pirate.svg',
  'whaling': 'whaling.svg',
  'penal': 'penal.svg',
  'naval base': 'naval base.svg',
  'naval-base': 'naval base.svg',
  'navalbase': 'naval base.svg',
  'research station': 'research-station.svg',
  'research-station': 'research-station.svg',
  'researchstation': 'research-station.svg',
  'rocket': 'rocket.svg',
  'taz': 'TAZ.svg',
  'type site': 'type site.svg',
  'type-site': 'type site.svg',
  'typesite': 'type site.svg',
  'rock shelter': 'rock shelter.svg',
  'rock-shelter': 'rock shelter.svg',
  'rockshelter': 'rock shelter.svg'
};

export function getIconFilenameForType(typeSite: string): string {
  const key = normalizeTypeKey(typeSite);
  return ICON_TYPE_TO_FILENAME[key] || 'settlement.svg';
}

// Unique list of icon filenames available for settlements legend
export const ICON_FILENAMES: string[] = Array.from(
  new Set(Object.values(ICON_TYPE_TO_FILENAME))
).sort();


