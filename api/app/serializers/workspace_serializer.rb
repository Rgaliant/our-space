class WorkspaceSerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :plan, :created_at, :updated_at

  association :owner, blueprint: UserSerializer

  view :with_members do
    association :members, blueprint: UserSerializer
  end
end
