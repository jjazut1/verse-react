"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin if it hasn't been initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Simple test function
exports.helloWorld = functions.https.onCall((data, context) => {
    return { message: "Hello from Firebase!" };
});
//# sourceMappingURL=test.js.map