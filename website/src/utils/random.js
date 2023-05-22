export function randomAngle() {
    return Math.random() * Math.PI * 2;
}

export function randomInt(max) {
    return Math.floor(Math.random() * max);
}

export function* randomRange(start, stop, step) {
    // Use a mapping to convert a standard range into the desired range.
    let mapping =  i =>  (i*step) + start;
    // Compute the number of numbers in this range.
    let maximum = (stop - start); // step
    // Seed range with a random integer.
    let value = randomInt(maximum);
    //
    // Construct an offset, multiplier, and modulus for a linear
    // congruential generator. These generators are cyclic and
    // non-repeating when they maintain the properties:
    //
    //   1) "modulus" and "offset" are relatively prime.
    //   2) ["multiplier" - 1] is divisible by all prime factors of "modulus".
    //   3) ["multiplier" - 1] is divisible by 4 if "modulus" is divisible by 4.
    //
    let offset = randomInt(maximum) * 2 + 1;      // Pick a random odd-valued offset.
    let multiplier = 4 * Math.floor(maximum/4) + 1;                // Pick a multiplier 1 greater than a multiple of 4.
    let modulus = 2 ** Math.ceil(Math.log2(maximum)); // Pick a modulus just big enough to generate all numbers (power of 2).
    // Track the random numbers generated
    let count = 0;
    while (count < maximum) {
        // If this is a valid value, yield it in generator fashion.
        if (value < maximum) {
            ++count;
            yield value;
        }
        // Calculate the next value in the sequence.
        value = (value * multiplier + offset) % modulus;
    }
}

export function* randomInGrid(topLeft, width, height) {
    let gen = randomRange(0, width * height, 1);
    for (let i = gen.next(); !i.done; i = gen.next()) {
        yield {
            x: Math.floor(i.value % width) + topLeft.x,
            y:Math.floor(i.value / width) + topLeft.y,
        };
    }
}
