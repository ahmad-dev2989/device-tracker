/**
 * Cryptographic utility functions for device identity and authentication
 * using the standard Web Crypto API (SubtleCrypto).
 */
/**
 * Generate a new ECDSA P-256 key pair and return their JWK representations.
 */
export async function generateDeviceKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey({
        name: "ECDSA",
        namedCurve: "P-256",
    }, true, // extractable
    ["sign", "verify"]);
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    return { publicKeyJwk, privateKeyJwk };
}
/**
 * Sign a string challenge with the private key (JWK) and return signature in Hex format.
 */
export async function signChallenge(challenge, privateKeyJwk) {
    const privateKey = await window.crypto.subtle.importKey("jwk", privateKeyJwk, {
        name: "ECDSA",
        namedCurve: "P-256",
    }, false, ["sign"]);
    const encoder = new TextEncoder();
    const challengeBytes = encoder.encode(challenge);
    const signatureBuffer = await window.crypto.subtle.sign({
        name: "ECDSA",
        hash: { name: "SHA-256" },
    }, privateKey, challengeBytes);
    // Convert raw signature buffer to hex representation
    const signatureArray = new Uint8Array(signatureBuffer);
    return Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
