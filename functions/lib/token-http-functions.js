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
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpTokenFunctions = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.httpTokenFunctions = functions.region('us-central1').https.onRequest((req, res) => {
    var _a;
    // Get the origin from the request
    const origin = ((_a = req.headers.origin) === null || _a === void 0 ? void 0 : _a.toString()) || '';
    // List of allowed origins
    const allowedOrigins = [
        'https://verse-testing.web.app',
        'https://verse-11f2d.web.app',
        'http://localhost:3000',
        'http://localhost:5000'
    ];
    // Check if the origin is allowed
    const isAllowed = !origin || allowedOrigins.includes(origin);
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://verse-testing.web.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        console.log('Handling preflight request from', origin);
        res.status(204).send('');
        return;
    }
    if (!isAllowed) {
        console.log(`Origin not allowed: ${origin}`);
        res.status(403).send({ error: 'CORS not allowed' });
        return;
    }
    // Log request details
    console.log(`${req.method} ${req.path} from ${origin}`);
    // Route based on the path
    const pathSegments = req.path.split('/').filter(Boolean);
    const endpoint = pathSegments[0] || '';
    console.log(`Requested endpoint: ${endpoint}`);
    // Ensure we only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Method not allowed' });
        return;
    }
    // Process the request based on the endpoint
    switch (endpoint) {
        case 'verifyToken':
        case 'testVerifyTokenAndLogin':
            handleVerifyToken(req, res);
            break;
        case 'getAssignment':
        case 'testGetAssignmentForToken':
            handleGetAssignment(req, res);
            break;
        default:
            res.status(404).send({ error: 'Endpoint not found' });
    }
});
function handleVerifyToken(req, res) {
    // Get token from request body
    const token = req.body.token;
    if (!token) {
        res.status(400).send({ error: 'Missing token' });
        return;
    }
    // Process the token
    admin.firestore()
        .collection('assignmentTokens')
        .doc(token)
        .get()
        .then(tokenDoc => {
        if (!tokenDoc.exists) {
            res.status(404).send({ error: 'Token not found or invalid' });
            return;
        }
        const tokenData = tokenDoc.data();
        const now = admin.firestore.Timestamp.now();
        if (tokenData.expiresAt.toMillis() < now.toMillis()) {
            res.status(410).send({ error: 'Token has expired' });
            return;
        }
        if (tokenData.used) {
            res.status(403).send({ error: 'Token has already been used' });
            return;
        }
        const { studentEmail, assignmentId } = tokenData;
        // Find or create user
        return admin.auth().getUserByEmail(studentEmail)
            .catch(() => {
            // User doesn't exist, create them
            return admin.auth().createUser({
                email: studentEmail,
                emailVerified: true
            }).then(newUser => {
                // Create user document in Firestore
                return admin.firestore().collection('users').doc(newUser.uid).set({
                    email: studentEmail.toLowerCase(),
                    role: 'student',
                    status: 'active',
                    createdAt: admin.firestore.Timestamp.now(),
                }).then(() => newUser);
            });
        })
            .then(userRecord => {
            // Create a custom token
            return admin.auth().createCustomToken(userRecord.uid, { assignmentId });
        })
            .then(customToken => {
            // Mark token as used
            return tokenDoc.ref.update({ used: true }).then(() => customToken);
        })
            .then(customToken => {
            // Return the token to the client
            res.status(200).send({ firebaseToken: customToken, assignmentId });
        });
    })
        .catch(error => {
        console.error('Error verifying token:', error);
        res.status(500).send({ error: 'Internal server error' });
    });
}
function handleGetAssignment(req, res) {
    // Get token from request body
    const token = req.body.token;
    if (!token) {
        res.status(400).send({ error: 'Missing token' });
        return;
    }
    // Look up the token
    admin.firestore()
        .collection('assignmentTokens')
        .doc(token)
        .get()
        .then(tokenDoc => {
        if (!tokenDoc.exists) {
            res.status(404).send({ error: 'Token not found' });
            return;
        }
        const tokenData = tokenDoc.data();
        const { assignmentId } = tokenData;
        // Get assignment details
        return admin.firestore()
            .collection('assignments')
            .doc(assignmentId)
            .get()
            .then(assignmentDoc => {
            if (!assignmentDoc.exists) {
                res.status(404).send({ error: 'Assignment not found' });
                return;
            }
            const assignmentData = assignmentDoc.data();
            res.status(200).send({
                assignmentId,
                linkToken: assignmentData === null || assignmentData === void 0 ? void 0 : assignmentData.linkToken
            });
        });
    })
        .catch(error => {
        console.error('Error getting assignment:', error);
        res.status(500).send({ error: 'Internal server error' });
    });
}
//# sourceMappingURL=token-http-functions.js.map