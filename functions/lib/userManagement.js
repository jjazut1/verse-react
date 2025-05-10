"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = exports.preRegisterStudents = void 0;
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
// Make sure Firebase is initialized in the main index.ts file
const db = admin.firestore();
// Using Firebase Functions v1 API to avoid TypeScript issues
exports.preRegisterStudents = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Verify caller is authenticated and has teacher/admin role
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to register students.");
    }
    // Check teacher permissions
    const teacherRef = await db.collection("users").doc(context.auth.uid).get();
    if (!teacherRef.exists || !["teacher", "admin"].includes((_a = teacherRef.data()) === null || _a === void 0 ? void 0 : _a.role)) {
        throw new functions.https.HttpsError("permission-denied", "Only teachers or admins can register students.");
    }
    const { studentEmails, classId } = data;
    if (!Array.isArray(studentEmails) || !studentEmails.length) {
        throw new functions.https.HttpsError("invalid-argument", "Please provide a valid array of student emails.");
    }
    const results = {
        success: [],
        errors: []
    };
    for (const email of studentEmails) {
        try {
            // Normalize and validate email
            const normalizedEmail = email.toLowerCase().trim();
            // Check if user already exists
            const existingUserQuery = await db.collection("users")
                .where("email", "==", normalizedEmail)
                .limit(1)
                .get();
            if (!existingUserQuery.empty) {
                // Update existing user if needed
                const existingUser = existingUserQuery.docs[0];
                if (classId && !((_b = existingUser.data().classes) === null || _b === void 0 ? void 0 : _b.includes(classId))) {
                    // Add user to class if provided
                    await existingUser.ref.update({
                        classes: admin.firestore.FieldValue.arrayUnion(classId),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedBy: context.auth.uid
                    });
                }
                results.success.push({ email: normalizedEmail, status: "updated" });
                continue;
            }
            // Create new pre-registered user
            const newUserId = db.collection("users").doc().id;
            await db.collection("users").doc(newUserId).set({
                email: normalizedEmail,
                role: "user",
                status: "invited",
                authComplete: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: context.auth.uid,
                classes: classId ? [classId] : []
            });
            results.success.push({ email: normalizedEmail, status: "created" });
        }
        catch (error) {
            logger.error(`Error registering student with email ${email}:`, error);
            results.errors.push({
                email,
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
    return results;
});
// User creation handler (uses Auth Triggers)
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    var _a;
    const { email, uid, displayName, photoURL, providerData } = user;
    if (!email) {
        logger.warn("User has no email; skipping user record creation.");
        return null;
    }
    try {
        // Check if user document already exists by UID
        const userRef = db.collection("users").doc(uid);
        const userSnapshot = await userRef.get();
        if (userSnapshot.exists) {
            // Update the existing user document with auth details
            await userRef.update({
                lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
                authComplete: true
            });
            logger.info(`Updated existing user document for UID: ${uid}`);
            return null;
        }
        // Check if there's a pre-created document with matching email
        // (created by teacher assignment)
        const emailQuery = await db.collection("users")
            .where("email", "==", email.toLowerCase())
            .where("authComplete", "==", false)
            .limit(1)
            .get();
        if (!emailQuery.empty) {
            const preCreatedDoc = emailQuery.docs[0];
            const preCreatedData = preCreatedDoc.data();
            // If document exists with matching email but different ID,
            // update that document with auth info
            if (preCreatedDoc.id !== uid) {
                await db.runTransaction(async (transaction) => {
                    var _a;
                    // Delete the pre-created document
                    transaction.delete(preCreatedDoc.ref);
                    // Create a new document with the Firebase UID
                    transaction.set(userRef, Object.assign(Object.assign({}, preCreatedData), { email: email.toLowerCase(), displayName: displayName || preCreatedData.displayName || '', photoURL: photoURL || preCreatedData.photoURL || '', userId: uid, authProvider: providerData && providerData.length > 0 ? ((_a = providerData[0]) === null || _a === void 0 ? void 0 : _a.providerId) || "unknown" : "unknown", authComplete: true, updatedAt: admin.firestore.FieldValue.serverTimestamp(), lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }));
                });
                logger.info(`Migrated teacher-created user to Firebase auth user: ${uid}`);
                return null;
            }
        }
        // Otherwise create a new user document
        const userData = {
            email: email.toLowerCase(),
            displayName: displayName || '',
            photoURL: photoURL || '',
            userId: uid,
            role: "user",
            status: "active",
            authProvider: providerData && providerData.length > 0 ? ((_a = providerData[0]) === null || _a === void 0 ? void 0 : _a.providerId) || "unknown" : "unknown",
            authComplete: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await userRef.set(userData);
        logger.info(`Created new user document for UID: ${uid}`);
        return null;
    }
    catch (error) {
        logger.error("Error in onUserCreate function:", error);
        return null;
    }
});
//# sourceMappingURL=userManagement.js.map