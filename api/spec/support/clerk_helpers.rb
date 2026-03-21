module ClerkHelpers
  def clerk_auth_headers(user_id)
    { "X-Clerk-User-Id" => user_id }
  end
end
