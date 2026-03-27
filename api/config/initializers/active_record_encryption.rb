Rails.application.configure do
  config.active_record.encryption.primary_key =
    ENV.fetch("AR_ENCRYPTION_PRIMARY_KEY", "placeholder_primary_key_32chars!!")
  config.active_record.encryption.deterministic_key =
    ENV.fetch("AR_ENCRYPTION_DETERMINISTIC_KEY", "placeholder_deterministic_32chars")
  config.active_record.encryption.key_derivation_salt =
    ENV.fetch("AR_ENCRYPTION_KEY_DERIVATION_SALT", "placeholder_salt_key_32chars!!!!")
end
