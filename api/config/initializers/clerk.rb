Clerk.configure do |c|
  c.secret_key = ENV.fetch("CLERK_SECRET_KEY", Rails.env.production? ? nil : "sk_test_placeholder")
end
