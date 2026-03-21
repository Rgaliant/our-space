RSpec.shared_examples "an authenticated endpoint" do |http_method, path_proc|
  it "returns 401 when no auth headers provided" do
    send(http_method, instance_exec(&path_proc))
    expect(response).to have_http_status(:unauthorized)
  end
end
