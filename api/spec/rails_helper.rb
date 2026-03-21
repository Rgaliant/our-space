require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rspec/rails"
require "webmock/rspec"
require "timecop"

Dir[Rails.root.join("spec/support/**/*.rb")].sort.each { |f| require f }

RSpec.configure do |config|
  config.fixture_paths = [ "#{::Rails.root}/spec/fixtures" ]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  config.include ClerkHelpers
  config.include JsonHelpers, type: :request

  config.include Shoulda::Matchers::ActiveRecord, type: :model
  config.include Shoulda::Matchers::ActiveModel,  type: :model

  config.before(:suite) do
    WebMock.disable_net_connect!(allow_localhost: true)
  end

  config.after(:each) do
    Timecop.return
  end
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
