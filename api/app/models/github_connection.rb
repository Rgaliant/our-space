class GithubConnection < ApplicationRecord
  belongs_to :user

  encrypts :access_token

  validates :user_id, presence: true, uniqueness: true
  validates :access_token, :github_login, :github_user_id, presence: true

  scope :for_user, ->(user) { where(user: user) }
end
