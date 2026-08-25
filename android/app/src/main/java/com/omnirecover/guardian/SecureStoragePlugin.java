package com.omnirecover.guardian;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureStorage")
public class SecureStoragePlugin extends Plugin {
    private static final String KEY_ALIAS = "OmniRecoverMasterKey";
    private static final String PREFS_NAME = "OmniRecoverSecurePrefs";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                ANDROID_KEYSTORE
            );
            keyGenerator.init(
                new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build()
            );
            return keyGenerator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
    }

    private String encrypt(String plainText) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv = cipher.getIV();
        byte[] encryptedBytes = cipher.doFinal(plainText.getBytes("UTF-8"));
        
        // Combine IV and Encrypted Bytes
        byte[] combined = new byte[iv.length + encryptedBytes.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);
        
        return Base64.encodeToString(combined, Base64.DEFAULT);
    }

    private String decrypt(String cipherText) throws Exception {
        byte[] combined = Base64.decode(cipherText, Base64.DEFAULT);
        SecretKey key = getOrCreateKey();
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        int ivLength = 12; // GCM default IV length is 12 bytes
        byte[] iv = new byte[ivLength];
        byte[] encryptedBytes = new byte[combined.length - ivLength];
        
        System.arraycopy(combined, 0, iv, 0, ivLength);
        System.arraycopy(combined, ivLength, encryptedBytes, 0, encryptedBytes.length);
        
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
        
        return new String(decryptedBytes, "UTF-8");
    }

    @PluginMethod
    public void saveCredential(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");

        if (key == null || value == null) {
            call.reject("Key or value cannot be null");
            return;
        }

        try {
            String encryptedValue = encrypt(value);
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(key, encryptedValue).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to encrypt/save credential: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getCredential(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key cannot be null");
            return;
        }

        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String encryptedValue = prefs.getString(key, null);
            
            JSObject ret = new JSObject();
            if (encryptedValue != null) {
                String decryptedValue = decrypt(encryptedValue);
                ret.put("value", decryptedValue);
            } else {
                ret.put("value", null);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to retrieve/decrypt credential: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteCredential(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key cannot be null");
            return;
        }

        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(key).apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to delete credential: " + e.getMessage());
        }
    }
}
