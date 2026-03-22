class Ticket < ApplicationRecord
  STATUSES   = %w[backlog todo in_progress in_review done].freeze
  PRIORITIES = %w[critical high medium low].freeze

  belongs_to :workspace
  belongs_to :project
  belongs_to :spec, optional: true
  belongs_to :distillation, optional: true
  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :created_by, class_name: "User"
  has_many :embeddings, as: :source, dependent: :destroy

  validates :title, presence: true, length: { maximum: 255 }
  validates :status,       inclusion: { in: STATUSES }
  validates :priority,     inclusion: { in: PRIORITIES }
  validates :story_points, numericality: { greater_than: 0, allow_nil: true }

  scope :backlog,      -> { where(status: "backlog") }
  scope :in_progress,  -> { where(status: "in_progress") }
  scope :by_priority,  -> { order(priority_score: :desc, position: :asc) }
  scope :assigned_to,  ->(user) { where(assignee: user) }
  scope :for_engineer, ->(user) { assigned_to(user).where(status: %w[todo in_progress]) }
end
