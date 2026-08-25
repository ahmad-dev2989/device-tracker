#[tauri::command]
fn save_secure_credential(key: String, secret: String) -> Result<(), String> {
    let entry = keyring::Entry::new("omnirecover-guardian", &key)
        .map_err(|e| e.to_string())?;
    entry.set_password(&secret)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_secure_credential(key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new("omnirecover-guardian", &key)
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_secure_credential(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new("omnirecover-guardian", &key)
        .map_err(|e| e.to_string())?;
    match entry.delete_password() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            save_secure_credential,
            get_secure_credential,
            delete_secure_credential
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

