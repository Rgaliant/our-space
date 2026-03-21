class Rack::Attack
  cache.store = ActiveSupport::Cache::MemoryStore.new

  # General API: 120 req/min per IP
  throttle("api/ip", limit: ENV.fetch("RATE_LIMIT_API_PER_MIN", 120).to_i, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # AI endpoints: 10 req/min per authenticated user (or IP fallback)
  throttle("ai/user", limit: ENV.fetch("RATE_LIMIT_AI_PER_MIN", 10).to_i, period: 1.minute) do |req|
    if req.path.include?("/ai/") && req.post?
      req.env["HTTP_X_CLERK_USER_ID"] || req.ip
    end
  end

  # Webhooks: 30 req/min per IP
  throttle("webhooks/ip", limit: 30, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/webhooks/")
  end

  self.throttled_responder = lambda do |req|
    env = req.respond_to?(:env) ? req.env : req
    retry_after = (env["rack.attack.match_data"] || {})[:period]
    [
      429,
      { "Content-Type" => "application/json", "Retry-After" => retry_after.to_s },
      [ { error: { message: "Too many requests", code: "RATE_LIMITED", details: { retry_after: retry_after } } }.to_json ]
    ]
  end
end
