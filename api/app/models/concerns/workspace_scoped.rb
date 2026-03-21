module WorkspaceScoped
  extend ActiveSupport::Concern

  included do
    belongs_to :workspace
    validates :workspace, presence: true

    scope :in_workspace, ->(workspace) { where(workspace: workspace) }
  end
end
