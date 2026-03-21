class WebhooksController < ApplicationController
  skip_before_action :require_clerk_session!

  def clerk
    payload = request.body.read
    headers = {
      "svix-id"        => request.headers["svix-id"],
      "svix-timestamp" => request.headers["svix-timestamp"],
      "svix-signature" => request.headers["svix-signature"]
    }

    begin
      wh = Svix::Webhook.new(ENV.fetch("CLERK_WEBHOOK_SECRET", "whsec_placeholder"))
      event = wh.verify(payload, headers)
    rescue StandardError
      return render json: { error: { message: "Invalid signature", code: "INVALID_SIGNATURE" } },
                    status: :bad_request
    end

    case event["type"]
    when "user.created", "user.updated"
      sync_user(event["data"])
    end

    head :ok
  end

  private

  def sync_user(data)
    User.upsert(
      {
        id:           data["id"],
        email:        data["email_addresses"].first["email_address"],
        display_name: [ data["first_name"], data["last_name"] ].compact.join(" ").presence,
        avatar_url:   data["image_url"],
        updated_at:   Time.current
      },
      unique_by: :id
    )
  end
end
