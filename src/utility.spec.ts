const MIN_GL_INT = -2147483647;
const MAX_GL_INT = 2147483647;

describe('Utility functions', () => {
  describe('Byte Converstions', () => {
    it('allows for numbers as low as -2,147,483,647', () => {
      const bytes = fourByteFromFloat(MIN_GL_INT, []);
      const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(float).toBe(MIN_GL_INT);
    });

    it('caps low numbers to -2,147,483,647', () => {
      const bytes = fourByteFromFloat(MIN_GL_INT - 1, []);
      const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(float).toBe(MIN_GL_INT);
    });

    it('allows for numbers as large as 2,147,483,647', () => {
      const bytes = fourByteFromFloat(MAX_GL_INT, []);
      const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(float).toBe(MAX_GL_INT);
    });

    it('caps large to 2,147,483,647', () => {
      const bytes = fourByteFromFloat(MAX_GL_INT + 1, []);
      const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(float).toBe(MAX_GL_INT);
    });
  });
});
