import { type MozerBookMove, type MozerBookTheoryItem } from '../../services/OpeningApiService';

export interface MozerBookMoveExtended extends MozerBookMove {
    count: number;
    children: MozerBookTheoryItem[];
}

export interface TheoryItemWithChildren extends MozerBookTheoryItem {
    nag: number;
    w: number;
    d: number;
    l: number;
    av: number;
    perf: number;
    children: MozerBookTheoryItem[];
    count: number;
}
