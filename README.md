# pwn.js

## Basic Usage

Pre-built version of the library is located at /dist/pwn.js. API documentation is available in /docs, and examples of complete exploits are in /examples.

If you want to implement a new Chakra exploit, you can use this basic template:

```js
var Exploit = (function() {
    var ChakraExploit = pwnjs.ChakraExploit,
        Integer = pwnjs.Integer;

    function Exploit() {
        ChakraExploit.call(this);
        // TODO: implement your exploit
        // TODO: leak any Chakra.dll address (e.g. a vtable)
        this.initChakra(vtable);
    }
    Exploit.prototype = Object.create(ChakraExploit.prototype);
    Exploit.prototype.constructor = Exploit;
    Exploit.prototype.read = function (address, size) {
        switch (size) {
            case 8:
            case 16:
            case 32:
            case 64:
                // TODO: implement memory read of address
        }
    }
    Exploit.prototype.write = function (address, value, size) {
        switch (size) {
            case 8:
            case 16:
            case 32:
            case 64:
                // TODO: implement memory write of value to address
        }
    }
    return Exploit;
})();
```

Using an exploit in a payload is easier if you use the deprecated _with_ statement:

```js
with (new Exploit()) {
    var malloc = importFunction('msvcrt.dll', 'malloc', Uint8Ptr);
    // ...
}
```

You can also define an Exploit object (non-deprecated, but more verbose):

```js
var e = new Exploit();
var malloc = e.importFunction('msvcrt.dll', 'malloc', Uint8Ptr);
// ...
```

## Build Instructions

You can rebuild the library using webpack:

```
$ npm install
$ npm run build
```

You can rebuild the documentation using jsdoc:

```
$ npm run jsdoc
```

Also, you can run a small HTTP server to host the documentation and examples:

```
$ npm start
```
