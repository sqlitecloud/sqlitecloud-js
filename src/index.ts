export const myPackage = (taco = ''): string => `${taco} from my package`

/**
 * Adds numbers, magic!
 * @param a First number
 * @param b Second number
 * @returns The sum of the two numbers
 */
export function add(a: number, b: number): number {
  return a + b
}

const ciao = add(2, 2)
console.log(ciao)

export { multiply } from './multiply'
