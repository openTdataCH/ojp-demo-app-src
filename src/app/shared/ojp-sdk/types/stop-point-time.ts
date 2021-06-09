export interface StopPointTime {
    timetabledTime: Date
    estimatedTime: Date | null
    delayMinutes: number | null
}
