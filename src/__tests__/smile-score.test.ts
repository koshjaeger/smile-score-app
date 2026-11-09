import { formatSmileScore, isSmileDetected } from '@/lib/smile-score'

describe('formatSmileScore', () => {
  describe('label assignment', () => {
    it('returns "Beaming" for scores in the 80–100% range', () => {
      expect(formatSmileScore(0.80).label).toBe('Beaming')
      expect(formatSmileScore(0.90).label).toBe('Beaming')
      expect(formatSmileScore(1.0).label).toBe('Beaming')
    })

    it('returns "Smiling" for scores in the 60–79% range', () => {
      expect(formatSmileScore(0.60).label).toBe('Smiling')
      expect(formatSmileScore(0.70).label).toBe('Smiling')
      expect(formatSmileScore(0.79).label).toBe('Smiling')
    })

    it('returns "Slight smile" for scores in the 40–59% range', () => {
      expect(formatSmileScore(0.40).label).toBe('Slight smile')
      expect(formatSmileScore(0.50).label).toBe('Slight smile')
      expect(formatSmileScore(0.59).label).toBe('Slight smile')
    })

    it('returns "Neutral" for scores in the 20–39% range', () => {
      expect(formatSmileScore(0.20).label).toBe('Neutral')
      expect(formatSmileScore(0.30).label).toBe('Neutral')
      expect(formatSmileScore(0.39).label).toBe('Neutral')
    })

    it('returns "Not smiling" for scores in the 0–19% range', () => {
      expect(formatSmileScore(0).label).toBe('Not smiling')
      expect(formatSmileScore(0.10).label).toBe('Not smiling')
      expect(formatSmileScore(0.19).label).toBe('Not smiling')
    })
  })

  describe('percentage calculation', () => {
    it('converts a decimal score to a rounded whole-number percentage', () => {
      expect(formatSmileScore(0.85).percentage).toBe(85)
      expect(formatSmileScore(0.50).percentage).toBe(50)
      expect(formatSmileScore(1.0).percentage).toBe(100)
      expect(formatSmileScore(0).percentage).toBe(0)
    })
  })
})

describe('isSmileDetected', () => {
  it('returns true for scores that constitute a smile (≥ 40%)', () => {
    expect(isSmileDetected(0.40)).toBe(true)
    expect(isSmileDetected(0.65)).toBe(true)
    expect(isSmileDetected(1.0)).toBe(true)
  })

  it('returns false for scores below the smile threshold (< 40%)', () => {
    expect(isSmileDetected(0)).toBe(false)
    expect(isSmileDetected(0.10)).toBe(false)
    expect(isSmileDetected(0.39)).toBe(false)
  })
})