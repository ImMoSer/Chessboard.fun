// src/entities/puzzle/model/types.ts

export interface TopInfoStat {
    icon: string
    value: string | number
    label?: string
    color?: string
}

export interface TopInfoBadge {
    text: string
    type: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}

export interface TopInfoDisplay {
    title: string
    mainValue?: string | number
    mainIcon?: string
    mainColor?: string
    badges: TopInfoBadge[]
    stats: TopInfoStat[]
    secondaryText?: string
    // Специальные поля для кастомной верстки, если она неизбежна (например, таймер)
    customType?: 'tornado' | 'diamond-hunter' | 'puzzle'
}
