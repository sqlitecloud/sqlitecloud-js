import { myPackage, add } from '../src';

describe('index', () => {
  describe('myPackage', () => {
    it('should return a string containing the message', () => {
      const message = 'Hello';

      const result = myPackage(message);

      expect(result).toMatch(message);
    });
  });

  describe('add', () => {
    it('should add', () => {
      expect(add(2, 4)).toBe(6);
    });
  });
});
