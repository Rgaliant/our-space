class GithubRepository < ApplicationRecord
  SYNC_STATUSES = %w[pending syncing synced failed].freeze

  belongs_to :workspace
  belongs_to :project, optional: true
  belongs_to :connected_by, class_name: "User", foreign_key: :connected_by_id

  validates :full_name, presence: true, uniqueness: { scope: :workspace_id, message: "already connected to this workspace" }
  validates :name, :github_repo_id, presence: true
  validates :sync_status, inclusion: { in: SYNC_STATUSES }

  scope :for_workspace, ->(ws) { where(workspace: ws) }
  scope :synced,  -> { where(sync_status: "synced") }
  scope :pending, -> { where(sync_status: "pending") }
  scope :failed,  -> { where(sync_status: "failed") }
  scope :syncing, -> { where(sync_status: "syncing") }
end
