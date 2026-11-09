export interface SmileResult {
    percentage: number
    label: string
  }
  
  export function formatSmileScore(score: number): SmileResult {
    const percentage = Math.round(score * 100)
    let label: string
  
    if (percentage >= 80) label = 'Beaming'
    else if (percentage >= 60) label = 'Smiling'
    else if (percentage >= 40) label = 'Slight smile'
    else if (percentage >= 20) label = 'Neutral'
    else label = 'Not smiling'
  
    return { percentage, label }
  }
  
  export function isSmileDetected(score: number): boolean {
    return score > 0.3
  }