class UserSerializer < Blueprinter::Base
  identifier :id
  fields :email, :display_name, :avatar_url
end
