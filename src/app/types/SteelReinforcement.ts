export type Bar = {
    diameter: number; // mm
    section: number; // cm²
    weight: number; // kg
}

export type BarsArray = Bar[];

export type BarsObject = {
    [key: string]: Bar
}

export type BarsCalculationResult = {
    bars: BarsObject,
    total: {
        sections: number
    }
}