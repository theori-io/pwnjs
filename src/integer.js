/**
 * @license long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/long.js for details
 */
var Integer = (function() {
    /**
     * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
     *  See the from* functions below for more convenient ways of constructing Integers.
     * @exports Integer
     * @class A Integer class for representing a 64 bit two's-complement integer value.
     * @param {number} low The low (signed) 32 bits of the long
     * @param {number} high The high (signed) 32 bits of the long
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @constructor
     */
    function Integer(low, high, unsigned, size) {

        this.size = size || 64;

        if (size == 8) {
            low &= 0xff;
            if (unsigned || low < 0x80) {
                high = 0;
            } else {
                low |= 0xffffff00;
                high = 0xffffffff;
            }
        } else if (size == 16) {
            low &= 0xffff;
            if (unsigned || low < 0x8000) {
                high = 0;
            } else {
                low |= 0xffff0000;
                high = 0xffffffff;
            }
        } else if (size == 32) {
            if (unsigned || (low|0) >= 0) {
                high = 0;
            } else {
                high = 0xffffffff;
            }
        }

        /**
         * The low 32 bits as a signed value.
         * @type {number}
         */
        this.low = low | 0;

        /**
         * The high 32 bits as a signed value.
         * @type {number}
         */
        this.high = high | 0;

        /**
         * Whether unsigned or not.
         * @type {boolean}
         */
        this.unsigned = !!unsigned;
    }

    // The internal representation of a long is the two given signed, 32-bit values.
    // We use 32-bit pieces because these are the size of integers on which
    // Javascript performs bit-operations.  For operations like addition and
    // multiplication, we split each number into 16 bit pieces, which can easily be
    // multiplied within Javascript's floating-point representation without overflow
    // or change in sign.
    //
    // In the algorithms below, we frequently reduce the negative case to the
    // positive case by negating the input(s) and then post-processing the result.
    // Note that we must ALWAYS check specially whether those values are MIN_VALUE
    // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
    // a positive number, it overflows back into a negative).  Not handling this
    // case would often result in infinite recursion.
    //
    // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
    // methods on which they depend.

    /**
     * An indicator used to reliably determine if an object is a Integer or not.
     * @type {boolean}
     * @const
     * @private
     */
    Integer.prototype.__isInteger__;

    Object.defineProperty(Integer.prototype, "__isInteger__", {
        value: true,
        enumerable: false,
        configurable: false
    });

    /**
     * @function
     * @param {*} obj Object
     * @returns {boolean}
     * @inner
     */
    function isInteger(obj) {
        return (obj && obj["__isInteger__"]) === true;
    }

    /**
     * Tests if the specified object is a Integer.
     * @function
     * @param {*} obj Object
     * @returns {boolean}
     */
    Integer.isInteger = isInteger;

    /**
     * A cache of the Integer representations of small integer values.
     * @type {!Object}
     * @inner
     */
    var INT_CACHE = {};

    /**
     * A cache of the Integer representations of small unsigned integer values.
     * @type {!Object}
     * @inner
     */
    var UINT_CACHE = {};

    /**
     * @param {number} value
     * @param {boolean=} unsigned
     * @returns {!Integer}
     * @inner
     */
    function fromInt(value, unsigned) {
        var obj, cachedObj, cache;
        if (unsigned) {
            value >>>= 0;
            if (cache = (0 <= value && value < 256)) {
                cachedObj = UINT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true);
            if (cache)
                UINT_CACHE[value] = obj;
            return obj;
        } else {
            value |= 0;
            if (cache = (-128 <= value && value < 128)) {
                cachedObj = INT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = fromBits(value, value < 0 ? -1 : 0, false);
            if (cache)
                INT_CACHE[value] = obj;
            return obj;
        }
    }

    /**
     * Returns a Integer representing the given 32 bit integer value.
     * @function
     * @param {number} value The 32 bit integer in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Integer} The corresponding Integer value
     */
    Integer.fromInt = fromInt;

    /**
     * @param {number} value
     * @param {boolean=} unsigned
     * @returns {!Integer}
     * @inner
     */
    function fromNumber(value, unsigned) {
        if (isNaN(value) || !isFinite(value))
            return unsigned ? UZERO : ZERO;
        if (unsigned) {
            if (value < 0)
                return UZERO;
            if (value >= TWO_PWR_64_DBL)
                return MAX_UNSIGNED_VALUE;
        } else {
            if (value <= -TWO_PWR_63_DBL)
                return MIN_VALUE;
            if (value + 1 >= TWO_PWR_63_DBL)
                return MAX_VALUE;
        }
        if (value < 0)
            return fromNumber(-value, unsigned).neg();
        return fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
    }

    /**
     * Returns a Integer representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     * @function
     * @param {number} value The number in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Integer} The corresponding Integer value
     */
    Integer.fromNumber = fromNumber;

    /**
     * @param {number} lowBits
     * @param {number} highBits
     * @param {boolean=} unsigned
     * @returns {!Integer}
     * @inner
     */
    function fromBits(lowBits, highBits, unsigned) {
        return new Integer(lowBits, highBits, unsigned);
    }

    /**
     * Returns a Integer representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @function
     * @param {number} lowBits The low 32 bits
     * @param {number} highBits The high 32 bits
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Integer} The corresponding Integer value
     */
    Integer.fromBits = fromBits;

    /**
     * @function
     * @param {number} base
     * @param {number} exponent
     * @returns {number}
     * @inner
     */
    var pow_dbl = Math.pow; // Used 4 times (4*8 to 15+4)

    /**
     * @param {string} str
     * @param {(boolean|number)=} unsigned
     * @param {number=} radix
     * @returns {!Integer}
     * @inner
     */
    function fromString(str, unsigned, radix) {
        if (str.length === 0)
            throw Error('empty string');
        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
            return ZERO;
        if (typeof unsigned === 'number') { 
            // For goog.math.long compatibility
            radix = unsigned,
            unsigned = false;
        } else {
            unsigned = !! unsigned;
        }
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw RangeError('radix');

        var p;
        if ((p = str.indexOf('-')) > 0)
            throw Error('interior hyphen');
        else if (p === 0) {
            return fromString(str.substring(1), unsigned, radix).neg();
        }

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = fromNumber(pow_dbl(radix, 8));

        var result = ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i),
                value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = fromNumber(pow_dbl(radix, size));
                result = result.mul(power).add(fromNumber(value));
            } else {
                result = result.mul(radixToPower);
                result = result.add(fromNumber(value));
            }
        }
        result.unsigned = unsigned;
        return result;
    }

    /**
     * Returns a Integer representation of the given string, written using the specified radix.
     * @function
     * @param {string} str The textual representation of the Integer
     * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
     * @returns {!Integer} The corresponding Integer value
     */
    Integer.fromString = fromString;

    /**
     * @function
     * @param {!Integer|number|string|!{low: number, high: number, unsigned: boolean}} val
     * @returns {!Integer}
     * @inner
     */
    function fromValue(val) {
        if (val /* is compatible */ instanceof Integer)
            return val;
        if (typeof val === 'number')
            return fromNumber(val);
        if (typeof val === 'string')
            return fromString(val);
        // Throws for non-objects, converts non-instanceof Integer:
        return fromBits(val.low, val.high, val.unsigned);
    }

    /**
     * Converts the specified value to a Integer.
     * @function
     * @param {!Integer|number|string|!{low: number, high: number, unsigned: boolean}} val Value
     * @returns {!Integer}
     */
    Integer.fromValue = fromValue;

    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
    // no runtime penalty for these.

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_16_DBL = 1 << 16;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_24_DBL = 1 << 24;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

    /**
     * @type {!Integer}
     * @const
     * @inner
     */
    var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);

    /**
     * @type {!Integer}
     * @inner
     */
    var ZERO = fromInt(0);

    /**
     * Signed zero.
     * @type {!Integer}
     */
    Integer.ZERO = ZERO;

    /**
     * @type {!Integer}
     * @inner
     */
    var UZERO = fromInt(0, true);

    /**
     * Unsigned zero.
     * @type {!Integer}
     */
    Integer.UZERO = UZERO;

    /**
     * @type {!Integer}
     * @inner
     */
    var ONE = fromInt(1);

    /**
     * Signed one.
     * @type {!Integer}
     */
    Integer.ONE = ONE;

    /**
     * @type {!Integer}
     * @inner
     */
    var UONE = fromInt(1, true);

    /**
     * Unsigned one.
     * @type {!Integer}
     */
    Integer.UONE = UONE;

    /**
     * @type {!Integer}
     * @inner
     */
    var NEG_ONE = fromInt(-1);

    /**
     * Signed negative one.
     * @type {!Integer}
     */
    Integer.NEG_ONE = NEG_ONE;

    /**
     * @type {!Integer}
     * @inner
     */
    var MAX_VALUE = fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

    /**
     * Maximum signed value.
     * @type {!Integer}
     */
    Integer.MAX_VALUE = MAX_VALUE;

    /**
     * @type {!Integer}
     * @inner
     */
    var MAX_UNSIGNED_VALUE = fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

    /**
     * Maximum unsigned value.
     * @type {!Integer}
     */
    Integer.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;

    /**
     * @type {!Integer}
     * @inner
     */
    var MIN_VALUE = fromBits(0, 0x80000000|0, false);

    /**
     * Minimum signed value.
     * @type {!Integer}
     */
    Integer.MIN_VALUE = MIN_VALUE;

    /**
     * @alias Integer.prototype
     * @inner
     */
    var IntegerPrototype = Integer.prototype;

    /**
     * Converts the Integer to a 32 bit integer, assuming it is a 32 bit integer.
     * @returns {number}
     */
    IntegerPrototype.toInt = function toInt() {
        return this.unsigned ? this.low >>> 0 : this.low;
    };

    /**
     * Converts the Integer to a the nearest floating-point representation of this value (double, 53 bit mantissa).
     * @returns {number}
     */
    IntegerPrototype.toNumber = function toNumber() {
        if (this.unsigned)
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };

    /**
     * Converts the Integer to a string written in the specified radix.
     * @param {number=} radix Radix (2-36), defaults to 10
     * @returns {string}
     * @override
     * @throws {RangeError} If `radix` is out of range
     */
    IntegerPrototype.toString = function toString(radix) {
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw RangeError('radix');
        if (this.isZero())
            return '0';
        if (this.isNegative()) { // Unsigned Integers are never negative
            if (this.eq(MIN_VALUE)) {
                // We need to change the Integer value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixInteger = fromNumber(radix),
                    div = this.div(radixInteger),
                    rem1 = div.mul(radixInteger).sub(this);
                return div.toString(radix) + rem1.toInt().toString(radix);
            } else
                return '-' + this.neg().toString(radix);
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
            rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower),
                intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
                digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero())
                return digits + result;
            else {
                while (digits.length < 6)
                    digits = '0' + digits;
                result = '' + digits + result;
            }
        }
    };

    /**
     * Gets the high 32 bits as a signed integer.
     * @returns {number} Signed high bits
     */
    IntegerPrototype.getHighBits = function getHighBits() {
        return this.high;
    };

    /**
     * Gets the high 32 bits as an unsigned integer.
     * @returns {number} Unsigned high bits
     */
    IntegerPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
        return this.high >>> 0;
    };

    /**
     * Gets the low 32 bits as a signed integer.
     * @returns {number} Signed low bits
     */
    IntegerPrototype.getLowBits = function getLowBits() {
        return this.low;
    };

    /**
     * Gets the low 32 bits as an unsigned integer.
     * @returns {number} Unsigned low bits
     */
    IntegerPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
        return this.low >>> 0;
    };

    /**
     * Gets the number of bits needed to represent the absolute value of this Integer.
     * @returns {number}
     */
    IntegerPrototype.getNumBitsAbs = function getNumBitsAbs() {
        if (this.isNegative()) // Unsigned Integers are never negative
            return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
        var val = this.high != 0 ? this.high : this.low;
        for (var bit = 31; bit > 0; bit--)
            if ((val & (1 << bit)) != 0)
                break;
        return this.high != 0 ? bit + 33 : bit + 1;
    };

    /**
     * Tests if this Integer's value equals zero.
     * @returns {boolean}
     */
    IntegerPrototype.isZero = function isZero() {
        return this.high === 0 && this.low === 0;
    };

    /**
     * Tests if this Integer's value is negative.
     * @returns {boolean}
     */
    IntegerPrototype.isNegative = function isNegative() {
        return !this.unsigned && this.high < 0;
    };

    /**
     * Tests if this Integer's value is positive.
     * @returns {boolean}
     */
    IntegerPrototype.isPositive = function isPositive() {
        return this.unsigned || this.high >= 0;
    };

    /**
     * Tests if this Integer's value is odd.
     * @returns {boolean}
     */
    IntegerPrototype.isOdd = function isOdd() {
        return (this.low & 1) === 1;
    };

    /**
     * Tests if this Integer's value is even.
     * @returns {boolean}
     */
    IntegerPrototype.isEven = function isEven() {
        return (this.low & 1) === 0;
    };

    /**
     * Tests if this Integer's value equals the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.equals = function equals(other) {
        if (!isInteger(other))
            other = fromValue(other);
        if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
            return false;
        return this.high === other.high && this.low === other.low;
    };

    /**
     * Tests if this Integer's value equals the specified's. This is an alias of {@link Integer#equals}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.eq = IntegerPrototype.equals;

    /**
     * Tests if this Integer's value differs from the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.notEquals = function notEquals(other) {
        return !this.eq(/* validates */ other);
    };

    /**
     * Tests if this Integer's value differs from the specified's. This is an alias of {@link Integer#notEquals}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.neq = IntegerPrototype.notEquals;

    /**
     * Tests if this Integer's value is less than the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.lessThan = function lessThan(other) {
        return this.comp(/* validates */ other) < 0;
    };

    /**
     * Tests if this Integer's value is less than the specified's. This is an alias of {@link Integer#lessThan}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.lt = IntegerPrototype.lessThan;

    /**
     * Tests if this Integer's value is less than or equal the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
        return this.comp(/* validates */ other) <= 0;
    };

    /**
     * Tests if this Integer's value is less than or equal the specified's. This is an alias of {@link Integer#lessThanOrEqual}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.lte = IntegerPrototype.lessThanOrEqual;

    /**
     * Tests if this Integer's value is greater than the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.greaterThan = function greaterThan(other) {
        return this.comp(/* validates */ other) > 0;
    };

    /**
     * Tests if this Integer's value is greater than the specified's. This is an alias of {@link Integer#greaterThan}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.gt = IntegerPrototype.greaterThan;

    /**
     * Tests if this Integer's value is greater than or equal the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
        return this.comp(/* validates */ other) >= 0;
    };

    /**
     * Tests if this Integer's value is greater than or equal the specified's. This is an alias of {@link Integer#greaterThanOrEqual}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {boolean}
     */
    IntegerPrototype.gte = IntegerPrototype.greaterThanOrEqual;

    /**
     * Compares this Integer's value with the specified's.
     * @param {!Integer|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     */
    IntegerPrototype.compare = function compare(other) {
        if (!isInteger(other))
            other = fromValue(other);
        if (this.eq(other))
            return 0;
        var thisNeg = this.isNegative(),
            otherNeg = other.isNegative();
        if (thisNeg && !otherNeg)
            return -1;
        if (!thisNeg && otherNeg)
            return 1;
        // At this point the sign bits are the same
        if (!this.unsigned)
            return this.sub(other).isNegative() ? -1 : 1;
        // Both are positive if at least one is unsigned
        return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
    };

    /**
     * Compares this Integer's value with the specified's. This is an alias of {@link Integer#compare}.
     * @function
     * @param {!Integer|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     */
    IntegerPrototype.comp = IntegerPrototype.compare;

    /**
     * Negates this Integer's value.
     * @returns {!Integer} Negated Integer
     */
    IntegerPrototype.negate = function negate() {
        if (!this.unsigned && this.eq(MIN_VALUE))
            return MIN_VALUE;
        return this.not().add(ONE);
    };

    /**
     * Negates this Integer's value. This is an alias of {@link Integer#negate}.
     * @function
     * @returns {!Integer} Negated Integer
     */
    IntegerPrototype.neg = IntegerPrototype.negate;

    /**
     * Returns the sum of this and the specified Integer.
     * @param {!Integer|number|string} addend Addend
     * @returns {!Integer} Sum
     */
    IntegerPrototype.add = function add(addend) {
        if (!isInteger(addend))
            addend = fromValue(addend);

        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = addend.high >>> 16;
        var b32 = addend.high & 0xFFFF;
        var b16 = addend.low >>> 16;
        var b00 = addend.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned, this.size);
    };

    /**
     * Returns the difference of this and the specified Integer.
     * @param {!Integer|number|string} subtrahend Subtrahend
     * @returns {!Integer} Difference
     */
    IntegerPrototype.subtract = function subtract(subtrahend) {
        if (!isInteger(subtrahend))
            subtrahend = fromValue(subtrahend);
        return this.add(subtrahend.neg());
    };

    /**
     * Returns the difference of this and the specified Integer. This is an alias of {@link Integer#subtract}.
     * @function
     * @param {!Integer|number|string} subtrahend Subtrahend
     * @returns {!Integer} Difference
     */
    IntegerPrototype.sub = IntegerPrototype.subtract;

    /**
     * Returns the product of this and the specified Integer.
     * @param {!Integer|number|string} multiplier Multiplier
     * @returns {!Integer} Product
     */
    IntegerPrototype.multiply = function multiply(multiplier) {
        if (this.isZero())
            return ZERO;
        if (!isInteger(multiplier))
            multiplier = fromValue(multiplier);
        if (multiplier.isZero())
            return ZERO;
        if (this.eq(MIN_VALUE))
            return multiplier.isOdd() ? MIN_VALUE : ZERO;
        if (multiplier.eq(MIN_VALUE))
            return this.isOdd() ? MIN_VALUE : ZERO;

        if (this.isNegative()) {
            if (multiplier.isNegative())
                return this.neg().mul(multiplier.neg());
            else
                return this.neg().mul(multiplier).neg();
        } else if (multiplier.isNegative())
            return this.mul(multiplier.neg()).neg();

        // If both longs are small, use float multiplication
        if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
            return fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = multiplier.high >>> 16;
        var b32 = multiplier.high & 0xFFFF;
        var b16 = multiplier.low >>> 16;
        var b00 = multiplier.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned, this.size);
    };

    /**
     * Returns the product of this and the specified Integer. This is an alias of {@link Integer#multiply}.
     * @function
     * @param {!Integer|number|string} multiplier Multiplier
     * @returns {!Integer} Product
     */
    IntegerPrototype.mul = IntegerPrototype.multiply;

    /**
     * Returns this Integer divided by the specified. The result is signed if this Integer is signed or
     *  unsigned if this Integer is unsigned.
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Quotient
     */
    IntegerPrototype.divide = function divide(divisor) {
        if (!isInteger(divisor))
            divisor = fromValue(divisor);
        if (divisor.isZero())
            throw Error('division by zero');
        if (this.isZero())
            return this.unsigned ? UZERO : ZERO;
        var approx, rem, res;
        if (!this.unsigned) {
            // This section is only relevant for signed longs and is derived from the
            // closure library as a whole.
            if (this.eq(MIN_VALUE)) {
                if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                    return MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
                else if (divisor.eq(MIN_VALUE))
                    return ONE;
                else {
                    // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                    var halfThis = this.shr(1);
                    approx = halfThis.div(divisor).shl(1);
                    if (approx.eq(ZERO)) {
                        return divisor.isNegative() ? ONE : NEG_ONE;
                    } else {
                        rem = this.sub(divisor.mul(approx));
                        res = approx.add(rem.div(divisor));
                        return res;
                    }
                }
            } else if (divisor.eq(MIN_VALUE))
                return this.unsigned ? UZERO : ZERO;
            if (this.isNegative()) {
                if (divisor.isNegative())
                    return this.neg().div(divisor.neg());
                return this.neg().div(divisor).neg();
            } else if (divisor.isNegative())
                return this.div(divisor.neg()).neg();
            res = ZERO;
        } else {
            // The algorithm below has not been made for unsigned longs. It's therefore
            // required to take special care of the MSB prior to running it.
            if (!divisor.unsigned)
                divisor = divisor.toUnsigned();
            if (divisor.gt(this))
                return UZERO;
            if (divisor.gt(this.shru(1))) // 15 >>> 1 = 7 ; with divisor = 8 ; true
                return UONE;
            res = UZERO;
        }

        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        rem = this;
        while (rem.gte(divisor)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2),
                delta = (log2 <= 48) ? 1 : pow_dbl(2, log2 - 48),

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
                approxRes = fromNumber(approx),
                approxRem = approxRes.mul(divisor);
            while (approxRem.isNegative() || approxRem.gt(rem)) {
                approx -= delta;
                approxRes = fromNumber(approx, this.unsigned);
                approxRem = approxRes.mul(divisor);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero())
                approxRes = ONE;

            res = res.add(approxRes);
            rem = rem.sub(approxRem);
        }
        return res;
    };

    /**
     * Returns this Integer divided by the specified. This is an alias of {@link Integer#divide}.
     * @function
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Quotient
     */
    IntegerPrototype.div = IntegerPrototype.divide;

    /**
     * Returns this Integer modulo the specified.
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Remainder
     */
    IntegerPrototype.modulo = function modulo(divisor) {
        if (!isInteger(divisor))
            divisor = fromValue(divisor);
        return this.sub(this.div(divisor).mul(divisor));
    };

    /**
     * Returns this Integer modulo the specified. This is an alias of {@link Integer#modulo}.
     * @function
     * @param {!Integer|number|string} divisor Divisor
     * @returns {!Integer} Remainder
     */
    IntegerPrototype.mod = IntegerPrototype.modulo;

    /**
     * Returns the bitwise NOT of this Integer.
     * @returns {!Integer}
     */
    IntegerPrototype.not = function not() {
        return fromBits(~this.low, ~this.high, this.unsigned, this.size);
    };

    /**
     * Returns the bitwise AND of this Integer and the specified.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     */
    IntegerPrototype.and = function and(other) {
        if (!isInteger(other))
            other = fromValue(other);
        return fromBits(this.low & other.low, this.high & other.high, this.unsigned, this.size);
    };

    /**
     * Returns the bitwise OR of this Integer and the specified.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     */
    IntegerPrototype.or = function or(other) {
        if (!isInteger(other))
            other = fromValue(other);
        return fromBits(this.low | other.low, this.high | other.high, this.unsigned, this.size);
    };

    /**
     * Returns the bitwise XOR of this Integer and the given one.
     * @param {!Integer|number|string} other Other Integer
     * @returns {!Integer}
     */
    IntegerPrototype.xor = function xor(other) {
        if (!isInteger(other))
            other = fromValue(other);
        return fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned, this.size);
    };

    /**
     * Returns this Integer with bits shifted to the left by the given amount.
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shiftLeft = function shiftLeft(numBits) {
        if (isInteger(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned, this.size);
        else
            return fromBits(0, this.low << (numBits - 32), this.unsigned, this.size);
    };

    /**
     * Returns this Integer with bits shifted to the left by the given amount. This is an alias of {@link Integer#shiftLeft}.
     * @function
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shl = IntegerPrototype.shiftLeft;

    /**
     * Returns this Integer with bits arithmetically shifted to the right by the given amount.
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shiftRight = function shiftRight(numBits) {
        if (isInteger(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned, this.size);
        else
            return fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned, this.size);
    };

    /**
     * Returns this Integer with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Integer#shiftRight}.
     * @function
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shr = IntegerPrototype.shiftRight;

    /**
     * Returns this Integer with bits logically shifted to the right by the given amount.
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
        if (isInteger(numBits))
            numBits = numBits.toInt();
        numBits &= 63;
        if (numBits === 0)
            return this;
        else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned, this.size);
            } else if (numBits === 32)
                return fromBits(high, 0, this.unsigned, this.size);
            else
                return fromBits(high >>> (numBits - 32), 0, this.unsigned, this.size);
        }
    };

    /**
     * Returns this Integer with bits logically shifted to the right by the given amount. This is an alias of {@link Integer#shiftRightUnsigned}.
     * @function
     * @param {number|!Integer} numBits Number of bits
     * @returns {!Integer} Shifted Integer
     */
    IntegerPrototype.shru = IntegerPrototype.shiftRightUnsigned;

    /**
     * Converts this Integer to signed.
     * @returns {!Integer} Signed long
     */
    IntegerPrototype.toSigned = function toSigned() {
        if (!this.unsigned)
            return this;
        return fromBits(this.low, this.high, false, this.size);
    };

    /**
     * Converts this Integer to unsigned.
     * @returns {!Integer} Unsigned long
     */
    IntegerPrototype.toUnsigned = function toUnsigned() {
        if (this.unsigned)
            return this;
        return fromBits(this.low, this.high, true, this.size);
    };

    /**
     * Converts this Integer to its byte representation.
     * @param {boolean=} le Whether little or big endian, defaults to big endian
     * @returns {!Array.<number>} Byte representation
     */
    IntegerPrototype.toBytes = function(le) {
        return le ? this.toBytesLE() : this.toBytesBE();
    }

    /**
     * Converts this Integer to its little endian byte representation.
     * @returns {!Array.<number>} Little endian byte representation
     */
    IntegerPrototype.toBytesLE = function() {
        var hi = this.high,
            lo = this.low;
        return [
             lo         & 0xff,
            (lo >>>  8) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>> 24) & 0xff,
             hi         & 0xff,
            (hi >>>  8) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>> 24) & 0xff
        ];
    }

    /**
     * Converts this Integer to its big endian byte representation.
     * @returns {!Array.<number>} Big endian byte representation
     */
    IntegerPrototype.toBytesBE = function() {
        var hi = this.high,
            lo = this.low;
        return [
            (hi >>> 24) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>>  8) & 0xff,
             hi         & 0xff,
            (lo >>> 24) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>>  8) & 0xff,
             lo         & 0xff
        ];
    }

    return Integer;
})();

export default Integer;
