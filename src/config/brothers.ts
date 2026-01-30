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
    restrictions: [],
    active: true,
  },
  {
    id: 'randy-quinol',
    firstName: 'Randy',
    lastName: 'Quinol',
    fullName: 'Randy Quinol',
    privilege: 'elder',
    restrictions: [],
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
    restrictions: [],
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
    restrictions: [],
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
    restrictions: [],
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
 * Get brother by full name (case-insensitive, handles PDF name variations)
 */
export function getBrotherByName(name: string): Brother | undefined {
  const normalizedName = name.toLowerCase().trim();

  return brothers.find((b) => {
    const fullNameMatch = b.fullName.toLowerCase() === normalizedName;
    const lastFirstMatch =
      `${b.lastName}, ${b.firstName}`.toLowerCase() === normalizedName;
    const partialMatch =
      normalizedName.includes(b.lastName.toLowerCase()) &&
      normalizedName.includes(b.firstName.toLowerCase());

    return fullNameMatch || lastFirstMatch || partialMatch;
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
export function getBrothersByPrivilege(privilege: Brother['privilege']): Brother[] {
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
export function getWTConductor(publicTalkSpeaker: string | null): Brother | undefined {
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
