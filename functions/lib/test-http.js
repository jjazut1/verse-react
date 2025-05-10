const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });

// Simple HTTP function for testing
exports.testHelloWorld = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      return res.status(200).json({
        message: 'Hello from Firebase Function!'
      });
    } catch (error) {
      console.error('Error in testHelloWorld:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  });
}); 