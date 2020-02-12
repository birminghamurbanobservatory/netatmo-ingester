import {calculateRainRate} from './rain.service';


describe('Test calculateRainRate function', () => {

  test('Correctly calculates rain rate', () => {
    
    const from = new Date('2020-02-12T10:46:53.111Z');
    const to = new Date('2020-02-12T10:56:54.333Z');
    const depth = 0.303;
    const expectedRate = 1.81;
    const calculatedRate = calculateRainRate(from, to, depth); 
    expect(calculatedRate).toBe(expectedRate);

  });

  test('Throws error if from date is greater than to date', () => {
    const from = new Date('2020-02-12T11:46:53.111Z');
    const to = new Date('2020-02-12T10:56:54.333Z');
    const depth = 0.303;
    expect(() => {
      calculateRainRate(from, to, depth);
    }).toThrow();
  });

});



