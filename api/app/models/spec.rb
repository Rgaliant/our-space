class Spec < ApplicationRecord
  STATUSES = %w[draft review approved archived].freeze

  belongs_to :workspace
  belongs_to :project
  belongs_to :conversation, optional: true
  belongs_to :created_by, class_name: "User"
  has_many :tickets, dependent: :destroy
  has_many :embeddings, as: :source, dependent: :destroy

  validates :title, presence: true, length: { maximum: 255 }
  validates :content, presence: true
  validates :status, inclusion: { in: STATUSES }

  scope :draft,        -> { where(status: "draft") }
  scope :approved,     -> { where(status: "approved") }
  scope :ai_generated, -> { where(ai_generated: true) }
  scope :recent,       -> { order(created_at: :desc) }
end
