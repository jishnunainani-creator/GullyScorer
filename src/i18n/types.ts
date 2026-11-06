export type LanguageCode = 'en' | 'hi' | 'gu'

export interface LanguageOption {
  code: LanguageCode
  label: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिंदी' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
]

export interface Translations {
  // App Header & Navigation
  appTitle: string
  home: string
  matches: string
  tournaments: string
  teams: string
  players: string
  settings: string
  newMatch: string

  // Common Actions
  save: string
  cancel: string
  edit: string
  delete: string
  confirm: string
  close: string
  back: string
  next: string
  done: string
  select: string

  // Match Setup & Presets
  rulePreset: string
  standardCricket: string
  gullyCricket: string
  tennisBallCricket: string
  societyCricket: string
  customRules: string
  oversPerInnings: string
  ballsPerOver: string
  playersPerSide: string

  // Gully Rules
  oneTipOneHand: string
  oneTipOneHandDesc: string
  mankad: string
  mankadDesc: string
  hitWicket: string
  wallRules: string
  wallDirectHit: string
  wallTap: string
  carOrWindowHit: string
  carOrWindowHitOut: string
  lastManStands: string
  deadBall: string
  reball: string
  lbwAllowed: string

  // Dismissals
  bowled: string
  caught: string
  lbw: string
  runout: string
  stumped: string
  hitwicketDismissal: string
  retired: string
  oneTipCatch: string
  mankadDismissal: string

  // Scoring
  runs: string
  balls: string
  overs: string
  wide: string
  noBall: string
  bye: string
  legBye: string
  freeHit: string
  undo: string
  endOver: string
  target: string
  needRuns: string
  crr: string
  rrr: string
  matchWonBy: string
  matchTied: string

  // Player & Team Management
  captain: string
  viceCaptain: string
  battingStyle: string
  bowlingStyle: string
  rightHandBat: string
  leftHandBat: string
  rightArmFast: string
  rightArmSpin: string
  rightArmMedium: string
  leftArmFast: string
  leftArmSpin: string
  leftArmMedium: string
  noBowling: string
  jerseyNumber: string
  editPlayer: string
  editTeam: string
  chooseAvatar: string
  mascots: string
  iplThemes: string
  countries: string
  customColors: string
}
