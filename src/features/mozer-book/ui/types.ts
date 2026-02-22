import { type MozerBookMove, type MozerBookTheoryItem } from '@/shared/api/mozer-book/MozerBookService'

export interface MozerBookMoveExtended extends MozerBookMove {
  children: MozerBookTheoryItem[]
}

export interface TheoryItemWithChildren extends MozerBookMove {
  children: MozerBookTheoryItem[]
}
