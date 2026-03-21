class Project < ApplicationRecord
  STATUSES = %w[active paused archived].freeze

  belongs_to :workspace
  has_many :specs, dependent: :destroy
  has_many :tickets, dependent: :destroy
  has_many :feedback, dependent: :destroy
  has_many :conversations

  validates :name, presence: true, length: { maximum: 150 }
  validates :status, inclusion: { in: STATUSES }

  scope :active,   -> { where(status: "active") }
  scope :archived, -> { where(status: "archived") }
end
