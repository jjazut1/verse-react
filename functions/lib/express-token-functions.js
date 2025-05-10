"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressTokenFunctions = void 0;
const functions = __importStar(require("firebase-functions"));
// @ts-ignore - Skip type checking for Express and CORS
const express_1 = __importDefault(require("express"));
// @ts-ignore - Skip type checking for CORS
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
// Create Express app
const app = (0, express_1.default)();
// Set up CORS with allowed origins
const allowedOrigins = [
    'https://verse-testing.web.app',
    'https://verse-11f2d.web.app',
    'http://localhost:3000',
    'http://localhost:5000'
];
// Configure CORS middleware
// @ts-ignore - Skip type checking for corsOptions
const corsOptions = {
    origin: function (origin, callback) {
        console.log(`Received request from origin: ${origin}`);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`Origin not allowed: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
// Apply CORS middleware to preflight requests
// @ts-ignore - Skip type checking for CORS options
app.options('*', (0, cors_1.default)(corsOptions));
// Apply CORS middleware to all routes
// @ts-ignore - Skip type checking for CORS options
app.use((0, cors_1.default)(corsOptions));
// Parse JSON requests
app.use(express_1.default.json());
// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} from origin ${req.headers.origin}`);
    if (req.method === 'OPTIONS') {
        console.log('Pre-flight request detected');
        console.log('Headers:', JSON.stringify(req.headers));
    }
    next();
});
// Handle token verification and login
app.post('/verifyToken', async (req, res) => {
    console.log('verifyToken endpoint called');
    console.log('Request body:', req.body);
    const token = req.body.token;
    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }
    try {
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            return res.status(404).json({ error: 'Token not found or invalid' });
        }
        const tokenData = tokenDoc.data();
        const now = admin.firestore.Timestamp.now();
        if (tokenData.expiresAt.toMillis() < now.toMillis()) {
            return res.status(410).json({ error: 'Token has expired' });
        }
        if (tokenData.used) {
            return res.status(403).json({ error: 'Token has already been used' });
        }
        const { studentEmail, assignmentId } = tokenData;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(studentEmail);
        }
        catch (error) {
            userRecord = await admin.auth().createUser({
                email: studentEmail,
                emailVerified: true
            });
            await admin.firestore().collection('users').doc(userRecord.uid).set({
                email: studentEmail.toLowerCase(),
                role: 'student',
                status: 'active',
                createdAt: admin.firestore.Timestamp.now(),
            });
        }
        const customToken = await admin.auth().createCustomToken(userRecord.uid, {
            assignmentId,
        });
        await tokenDoc.ref.update({ used: true });
        return res.status(200).json({ firebaseToken: customToken, assignmentId });
    }
    catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Alias route for testVerifyTokenAndLogin to match frontend
app.post('/testVerifyTokenAndLogin', async (req, res) => {
    console.log('testVerifyTokenAndLogin alias called');
    const token = req.body.token;
    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }
    try {
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            return res.status(404).json({ error: 'Token not found or invalid' });
        }
        const tokenData = tokenDoc.data();
        const now = admin.firestore.Timestamp.now();
        if (tokenData.expiresAt.toMillis() < now.toMillis()) {
            return res.status(410).json({ error: 'Token has expired' });
        }
        if (tokenData.used) {
            return res.status(403).json({ error: 'Token has already been used' });
        }
        const { studentEmail, assignmentId } = tokenData;
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(studentEmail);
        }
        catch (error) {
            userRecord = await admin.auth().createUser({
                email: studentEmail,
                emailVerified: true
            });
            await admin.firestore().collection('users').doc(userRecord.uid).set({
                email: studentEmail.toLowerCase(),
                role: 'student',
                status: 'active',
                createdAt: admin.firestore.Timestamp.now(),
            });
        }
        const customToken = await admin.auth().createCustomToken(userRecord.uid, {
            assignmentId,
        });
        await tokenDoc.ref.update({ used: true });
        return res.status(200).json({ firebaseToken: customToken, assignmentId });
    }
    catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Get assignment info for used tokens
app.post('/getAssignment', async (req, res) => {
    console.log('getAssignment endpoint called');
    console.log('Request body:', req.body);
    const token = req.body.token;
    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }
    try {
        // Look up the token in the assignmentTokens collection
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            return res.status(404).json({ error: 'Token not found' });
        }
        const tokenData = tokenDoc.data();
        const { assignmentId } = tokenData;
        // Get the assignment details
        const assignmentDoc = await admin.firestore()
            .collection('assignments')
            .doc(assignmentId)
            .get();
        if (!assignmentDoc.exists) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        const assignmentData = assignmentDoc.data();
        return res.status(200).json({
            assignmentId,
            linkToken: assignmentData === null || assignmentData === void 0 ? void 0 : assignmentData.linkToken
        });
    }
    catch (error) {
        console.error('Error getting assignment info:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Alias route for testGetAssignmentForToken to match frontend
app.post('/testGetAssignmentForToken', async (req, res) => {
    console.log('testGetAssignmentForToken alias called');
    const token = req.body.token;
    if (!token) {
        return res.status(400).json({ error: 'Missing token' });
    }
    try {
        // Look up the token in the assignmentTokens collection
        const tokenDoc = await admin.firestore()
            .collection('assignmentTokens')
            .doc(token)
            .get();
        if (!tokenDoc.exists) {
            return res.status(404).json({ error: 'Token not found' });
        }
        const tokenData = tokenDoc.data();
        const { assignmentId } = tokenData;
        // Get the assignment details
        const assignmentDoc = await admin.firestore()
            .collection('assignments')
            .doc(assignmentId)
            .get();
        if (!assignmentDoc.exists) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        const assignmentData = assignmentDoc.data();
        return res.status(200).json({
            assignmentId,
            linkToken: assignmentData === null || assignmentData === void 0 ? void 0 : assignmentData.linkToken
        });
    }
    catch (error) {
        console.error('Error getting assignment info:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Catch-all for other routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});
// Export the Express app as a Firebase function
exports.expressTokenFunctions = functions.region('us-central1').https.onRequest(app);
//# sourceMappingURL=express-token-functions.js.map