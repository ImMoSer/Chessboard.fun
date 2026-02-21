import { type MozerBookMove, type MozerBookTheoryItem } from '@/features/mozer-book/api/MozerBookService'

export interface MozerBookMoveExtended extends MozerBookMove {
  children: MozerBookTheoryItem[]
}

export interface TheoryItemWithChildren extends MozerBookMove {
  children: MozerBookTheoryItem[]
}
