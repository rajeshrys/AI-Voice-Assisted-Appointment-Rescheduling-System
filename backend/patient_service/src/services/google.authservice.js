const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies Google ID Token sent from client frontend/mobile app
 * @param {string} idToken 
 * @returns {Promise<object>} payload containing user details (email, given_name, family_name, sub)
 */
async function verifyGoogleToken(idToken) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return {
            googleId: payload.sub,
            email: payload.email,
            firstName: payload.given_name || payload.name || "Patient",
            lastName: payload.family_name || "",
            emailVerified: payload.email_verified
        };
    } catch (error) {
        console.error("Error verifying Google ID Token:", error.message);
        throw new Error("Invalid Google Authentication Token");
    }
}

module.exports = {
    verifyGoogleToken
};
