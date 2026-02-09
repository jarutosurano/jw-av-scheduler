import type { Brother } from '../types';

/**
 * All brothers eligible for AV assignments
 */
export const brothers: Brother[] = [
  // Elders
  {
    id: 'jonas-santiso',
    firstName: 'Jonas',
    lastName: 'Santiso',
    fullName: 'Jonas Santiso',
    privilege: 'elder',
    restrictions: [],
    isWTConductor: 'primary',
    active: true,
  },
  {
    id: 'dandel-cabusas',
    firstName: 'Dandel',
    lastName: 'Cabusas',
    fullName: 'Dandel Cabusas',
    privilege: 'elder',
    restrictions: [],
    active: true,
  },
  {
    id: 'raffy-mondares',
    firstName: 'Raffy',
    lastName: 'Mondares',
    fullName: 'Raffy Mondares',
    privilege: 'elder',
    restrictions: ['no_video'],
    active: true,
  },
  {
    id: 'randy-quinol',
    firstName: 'Randy',
    lastName: 'Quinol',
    fullName: 'Randy Quinol',
    privilege: 'elder',
    restrictions: ['no_video'],
    active: true,
  },
  {
    id: 'matt-mancuso',
    firstName: 'Matt',
    lastName: 'Mancuso',
    fullName: 'Matt Mancuso',
    privilege: 'elder',
    restrictions: [],
    active: true,
  },
  {
    id: 'melky-basanes',
    firstName: 'Melky',
    lastName: 'Basanes',
    fullName: 'Melky Basanes',
    privilege: 'elder',
    restrictions: ['no_video'],
    active: true,
  },
  {
    id: 'gally-villanueva',
    firstName: 'Gally',
    lastName: 'Villanueva',
    fullName: 'Gally Villanueva',
    privilege: 'elder',
    restrictions: [],
    isWTConductor: 'backup',
    active: true,
  },
  {
    id: 'abraham-penera',
    firstName: 'Abraham',
    lastName: 'Peñera',
    fullName: 'Abraham Peñera',
    privilege: 'elder',
    restrictions: [],
    active: true,
  },
  {
    id: 'herman-lucero',
    firstName: 'Herman',
    lastName: 'Lucero',
    fullName: 'Herman Lucero',
    privilege: 'elder',
    restrictions: [],
    active: true,
  },
  {
    id: 'edgar-silverio',
    firstName: 'Edgar',
    lastName: 'Silverio',
    fullName: 'Edgar Silverio',
    privilege: 'elder',
    restrictions: ['no_video'],
    active: true,
  },

  // Ministerial Servants
  {
    id: 'jayr-sullano',
    firstName: 'Jayr',
    lastName: 'Sullano',
    fullName: 'Jayr Sullano',
    privilege: 'ministerial_servant',
    restrictions: [],
    active: true,
  },
  {
    id: 'edmer-sapla',
    firstName: 'Edmer',
    lastName: 'Sapla',
    fullName: 'Edmer Sapla',
    privilege: 'ministerial_servant',
    restrictions: ['no_video'],
    active: true,
  },
  {
    id: 'jared-nieva',
    firstName: 'Jared',
    lastName: 'Nieva',
    fullName: 'Jared Nieva',
    privilege: 'ministerial_servant',
    restrictions: [],
    active: true,
  },
  {
    id: 'ralph-arugay',
    firstName: 'Ralph',
    lastName: 'Arugay',
    fullName: 'Ralph Arugay',
    privilege: 'ministerial_servant',
    restrictions: [],
    active: true,
  },

  // Other Brothers (Unbaptized/Publishers)
  {
    id: 'zach-lucero',
    firstName: 'Zach',
    lastName: 'Lucero',
    fullName: 'Zach Lucero',
    privilege: 'publisher',
    restrictions: ['no_entrance'],
    active: true,
  },
  {
    id: 'cezar-macasieb',
    firstName: 'Cezar',
    lastName: 'Macasieb',
    fullName: 'Cezar Macasieb',
    privilege: 'publisher',
    restrictions: ['no_auditorium'],
    active: true,
  },
  {
    id: 'john-mahor',
    firstName: 'John',
    lastName: 'Mahor',
    fullName: 'John Mahor',
    privilege: 'publisher',
    restrictions: ['no_auditorium'],
    active: true,
  },
  {
    id: 'xian-salazar',
    firstName: 'Xian',
    lastName: 'Salazar',
    fullName: 'Xian Salazar',
    privilege: 'publisher',
    restrictions: [
      'no_audio',
      'no_video',
      'no_av_assistant',
      'no_frontStage',
      'no_auditorium',
      'no_entrance',
      'mic_once_monthly',
    ],
    active: true,
  },
];

/**
 * Get brother by ID
 */
export function getBrotherById(id: string): Brother | undefined {
  return brothers.find((b) => b.id === id);
}

/**
 * Strip accents/diacritics from a string (e.g., Peñera → Penera)
 */
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Nickname mappings: config firstName → PDF variations
 */
const nicknameMap: Record<string, string[]> = {
  randy: ['randino'],
  raffy: ['rafael'],
  matt: ['matthew'],
  melky: ['melquisidecks'],
  gally: ['sir galahad'],
  dandel: ['mike dandel'],
};

/**
 * Get brother by full name (case-insensitive, handles PDF name variations)
 */
export function getBrotherByName(name: string): Brother | undefined {
  const normalizedName = stripAccents(name.toLowerCase().trim());

  return brothers.find((b) => {
    const fullName = stripAccents(b.fullName.toLowerCase());
    const lastName = stripAccents(b.lastName.toLowerCase());
    const firstName = stripAccents(b.firstName.toLowerCase());

    // Direct matches
    if (fullName === normalizedName) return true;
    if (`${lastName}, ${firstName}` === normalizedName) return true;
    if (normalizedName.includes(lastName) && normalizedName.includes(firstName))
      return true;

    // Nickname matching: check if PDF name contains a known nickname for this brother
    if (normalizedName.includes(lastName)) {
      const nicknames = nicknameMap[firstName] || [];
      for (const nickname of nicknames) {
        if (normalizedName.includes(nickname)) return true;
      }
    }

    return false;
  });
}

/**
 * Get all active brothers
 */
export function getActiveBrothers(): Brother[] {
  return brothers.filter((b) => b.active);
}

/**
 * Get brothers by privilege
 */
export function getBrothersByPrivilege(
  privilege: Brother['privilege']
): Brother[] {
  return brothers.filter((b) => b.privilege === privilege && b.active);
}

/**
 * Get elders and ministerial servants only
 */
export function getEldersAndMS(): Brother[] {
  return brothers.filter(
    (b) =>
      (b.privilege === 'elder' || b.privilege === 'ministerial_servant') &&
      b.active
  );
}

/**
 * Get the WT Conductor for a given week
 * If primary conductor has public talk, backup takes over
 */
export function getWTConductor(
  publicTalkSpeaker: string | null
): Brother | undefined {
  const primary = brothers.find((b) => b.isWTConductor === 'primary');
  const backup = brothers.find((b) => b.isWTConductor === 'backup');

  if (!primary) return backup;

  // If primary is giving the public talk, backup conducts
  if (publicTalkSpeaker) {
    const speaker = getBrotherByName(publicTalkSpeaker);
    if (speaker && speaker.id === primary.id) {
      return backup;
    }
  }

  return primary;
}
