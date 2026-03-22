class PullRequest < ApplicationRecord
  STATUSES = %w[open merged closed].freeze
  GITHUB_URL_PATTERN = %r{\Ahttps://github\.com/([^/]+/[^/]+)/pull/(\d+)}

  belongs_to :ticket
  belongs_to :workspace

  validates :url, presence: true, format: { with: GITHUB_URL_PATTERN, message: "must be a GitHub pull request URL" }
  validates :status, inclusion: { in: STATUSES }

  before_validation :extract_github_metadata

  private

  def extract_github_metadata
    return unless url.present?
    match = url.match(GITHUB_URL_PATTERN)
    return unless match

    self.repo = match[1]
    self.pr_number = match[2].to_i
    self.title ||= "PR ##{pr_number}"
  end
end
