import { type MozerBookMove, type MozerBookTheoryItem } from '../../services/OpeningApiService'

export interface MozerBookMoveExtended extends MozerBookMove {
  children: MozerBookTheoryItem[]
}

export interface TheoryItemWithChildren extends MozerBookMove {
  children: MozerBookTheoryItem[]
}