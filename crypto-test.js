var crypto = require("crypto-js");
var base58check = require('base58check');

var pubkey = "0496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858ee";
// var pubkey = "0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352";

var hexParsed = crypto.enc.Hex.parse(pubkey);
let hexSha256 = crypto.SHA256(hexParsed);

let step1 = hexSha256.toString(crypto.enc.Hex);
console.log(step1);

let hexRipeMD160 = crypto.RIPEMD160(hexSha256);

let step2 = hexRipeMD160.toString(crypto.enc.Hex);
console.log(step2);

// prepend "00" in front of second hexstring, it's mainnet
let step3 = "00" + step2;
console.log(step3);

let hexExtRipeParsed = crypto.enc.Hex.parse(step3);
let hexRipeSha256 = crypto.SHA256(hexExtRipeParsed);

let step4 = hexRipeSha256.toString(crypto.enc.Hex);
console.log(step4);

let hexRipeSha256Again = crypto.SHA256(hexRipeSha256);
let step5 = hexRipeSha256Again.toString(crypto.enc.Hex);
console.log(step5);

let step6 = step5.substring(0, 8);
console.log(step6);

let step7 = (step3 + step6).toUpperCase();
console.log(step7);

let step7Buffer = Buffer.from(step7, 'hex');
console.log(step7.substring(2, 50));

let step8 = base58check.encode(step3, "", "hex");
console.log("==========");
console.log(step8);
console.log("==========");

// 00f54a5851e9372b87810a8e60cdd2e7cfd80b6e31c7f18fe8
// 00F54A5851E9372B87810A8E60CDD2E7CFD80B6E31C7F18FE8