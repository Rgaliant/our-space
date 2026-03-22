class Cycle < ApplicationRecord
  STATUSES = %w[upcoming active completed].freeze

  belongs_to :workspace
  belongs_to :project
  belongs_to :created_by, class_name: "User", foreign_key: :created_by_id, primary_key: :id
  has_many :tickets, dependent: :nullify

  validates :name, presence: true, length: { maximum: 255 }
  validates :status, inclusion: { in: STATUSES }
  validates :start_date, :end_date, presence: true
  validate :end_date_after_start_date

  scope :upcoming,  -> { where(status: "upcoming") }
  scope :active,    -> { where(status: "active") }
  scope :completed, -> { where(status: "completed") }
  scope :ordered,   -> { order(:start_date) }

  private

  def end_date_after_start_date
    return unless start_date && end_date
    errors.add(:end_date, "must be after start date") if end_date <= start_date
  end
end
