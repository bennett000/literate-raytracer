describe('We can write descriptions in blocks', () => {
  describe('We can nest descriptions', () => {
    it('we can specify sets of expectations', () => {
      expect(true).toBe(true);
    });
  });

  describe('throw handling', () => {
    it('we can expect things to throw', () => {
      expect(() => { throw new Error('foo'); }).toThrow();
    });

    it('we can expect things *not* to throw', () => {
      expect(() => {  }).not.toThrow();
    });
  });

  describe('we can run things before and after each test', () => {
    let count = 0;
    beforeEach(() => {
      count += 1;
    }); 

    afterEach(() => {
      count += 1;
    });

    it('starts with a before each', () => {
      expect(count).toBe(1);
    });

    it('then runs an after each and another before each', () => {
      expect(count).toBe(3);
    });
  });

  describe('we can nest before and afters', () => {
    let count = 0;
    let nestedCount = 0;
    beforeEach(() => {
      count += 1;
    }); 

    afterEach(() => {
      count += 1;
    });

    it('runs outer specs after specs in nested describes', () => {
      expect(count).toBe(5);
      expect(nestedCount).toBe(4);
    });

    describe('we can nest more before/after eaches', () => {
      beforeEach(() => {
        nestedCount += 1;
      });

      afterEach(() => {
        nestedCount += 1;
      });

      it('runs both before eaches *before* outer specs', () => {
        expect(count).toBe(1);
        expect(nestedCount).toBe(1);
      });

      it('runs both after eaches, and both before eaches *before* outer specs',
        () => {
          expect(count).toBe(3);
          expect(nestedCount).toBe(3);
        });

    });
  });
});
