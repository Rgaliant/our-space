class Distillation < ApplicationRecord
  STATUSES = %w[generating complete failed].freeze

  belongs_to :workspace
  belongs_to :created_by, class_name: "User", foreign_key: :created_by_id, primary_key: :id
  has_many :tickets, dependent: :nullify

  validates :north_star, presence: true, length: { maximum: 2000 }
  validates :status, inclusion: { in: STATUSES }

  scope :recent, -> { order(created_at: :desc) }
  scope :complete, -> { where(status: "complete") }
end
