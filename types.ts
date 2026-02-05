
export enum Role {
  ME = 'ME',
  PARTNER = 'PARTNER'
}

export interface Line {
  id: string;
  character: string;
  text: string;
  role: Role;
  audioUrl?: string;
}

export interface Scene {
  id: string;
  title: string;
  lines: Line[];
  createdAt: number;
}

export type AppView = 'HOME' | 'NEW_SCENE' | 'EDIT_ROLES' | 'REHEARSAL' | 'HELP' | 'DONATE_CONFIRM';
