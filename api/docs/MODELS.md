# Models

Models represent domain objects and own validations, associations, and query scopes. They do not contain business logic.

---

## Rules

1. **All validations in the model** — never in controllers or services
2. **Named scopes for common queries** — complex scopes as class methods returning `ActiveRecord::Relation`
3. **Callbacks permitted only for:**
   - Setting timestamps (Rails default — do not override)
   - Generating slugs (before_validation / before_create)
   - **Never** callbacks that touch other models — use services instead
4. **Concerns** in `app/models/concerns/` for behavior shared across ≥ 2 models
5. **No raw SQL** in model files — use scopes, Arel, or `app/queries/` objects
6. **No business logic** — models are data + constraints, not workflows

---

## User

```ruby
# app/models/user.rb
class User < ApplicationRecord
  # Clerk ID is the primary key — string, no auto-increment
  self.primary_key = "id"

  has_many :workspace_members, dependent: :destroy
  has_many :workspaces, through: :workspace_members
  has_many :owned_workspaces, class_name: "Workspace", foreign_key: :owner_id, dependent: :destroy
  has_many :specs, foreign_key: :created_by_id
  has_many :tickets, foreign_key: :assignee_id
  has_many :conversations

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :id, presence: true  # Clerk user ID must be set
end
```

---

## Workspace

```ruby
# app/models/workspace.rb
class Workspace < ApplicationRecord
  belongs_to :owner, class_name: "User"
  has_many :workspace_members, dependent: :destroy
  has_many :members, through: :workspace_members, source: :user
  has_many :projects, dependent: :destroy
  has_many :conversations, dependent: :destroy
  has_many :embeddings, dependent: :destroy

  validates :name, presence: true, length: { maximum: 100 }
  validates :slug, presence: true, uniqueness: true,
                   format: { with: /\A[a-z0-9-]+\z/, message: "only lowercase letters, numbers, and hyphens" }
  validates :plan, inclusion: { in: %w[free pro enterprise] }

  before_validation :generate_slug, on: :create

  scope :for_user, ->(user) { joins(:workspace_members).where(workspace_members: { user: user }) }

  private

  def generate_slug
    self.slug ||= name.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
  end
end
```

---

## WorkspaceMember

```ruby
# app/models/workspace_member.rb
class WorkspaceMember < ApplicationRecord
  ROLES = %w[owner admin stakeholder engineer].freeze

  belongs_to :workspace
  belongs_to :user

  validates :role, inclusion: { in: ROLES }
  validates :workspace_id, uniqueness: { scope: :user_id, message: "user is already a member" }

  scope :owners,       -> { where(role: "owner") }
  scope :admins,       -> { where(role: "admin") }
  scope :engineers,    -> { where(role: "engineer") }
  scope :stakeholders, -> { where(role: "stakeholder") }
end
```

---

## Project

```ruby
# app/models/project.rb
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
```

---

## Spec

```ruby
# app/models/spec.rb
class Spec < ApplicationRecord
  STATUSES = %w[draft review approved archived].freeze

  belongs_to :workspace
  belongs_to :project
  belongs_to :conversation, optional: true
  belongs_to :created_by, class_name: "User"
  has_many :tickets, dependent: :destroy
  has_many :embeddings, as: :source, dependent: :destroy

  validates :title, presence: true, length: { maximum: 255 }
  validates :status, inclusion: { in: STATUSES }
  validates :content, presence: true

  scope :draft,    -> { where(status: "draft") }
  scope :approved, -> { where(status: "approved") }
  scope :ai_generated, -> { where(ai_generated: true) }
  scope :by_project, ->(project) { where(project: project) }
  scope :recent, -> { order(created_at: :desc) }
end
```

---

## Ticket

```ruby
# app/models/ticket.rb
class Ticket < ApplicationRecord
  STATUSES   = %w[backlog todo in_progress in_review done].freeze
  PRIORITIES = %w[critical high medium low].freeze

  belongs_to :workspace
  belongs_to :project
  belongs_to :spec, optional: true
  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :created_by, class_name: "User"
  has_many :embeddings, as: :source, dependent: :destroy

  validates :title, presence: true, length: { maximum: 255 }
  validates :status,   inclusion: { in: STATUSES }
  validates :priority, inclusion: { in: PRIORITIES }
  validates :story_points, numericality: { greater_than: 0, allow_nil: true }

  scope :backlog,      -> { where(status: "backlog") }
  scope :in_progress,  -> { where(status: "in_progress") }
  scope :by_priority,  -> { order(priority_score: :desc, position: :asc) }
  scope :assigned_to,  ->(user) { where(assignee: user) }
  scope :for_engineer, ->(user) { assigned_to(user).where(status: %w[todo in_progress]) }
end
```

---

## Conversation + ConversationMessage

```ruby
# app/models/conversation.rb
class Conversation < ApplicationRecord
  belongs_to :workspace
  belongs_to :project, optional: true
  belongs_to :user
  has_many :messages, class_name: "ConversationMessage", dependent: :destroy

  validates :title, presence: true

  scope :recent, -> { order(updated_at: :desc) }
end

# app/models/conversation_message.rb
class ConversationMessage < ApplicationRecord
  ROLES = %w[user assistant].freeze

  belongs_to :conversation

  validates :role, inclusion: { in: ROLES }
  validates :content, presence: true

  scope :chronological, -> { order(:created_at) }
end
```

---

## Embedding

```ruby
# app/models/embedding.rb
class Embedding < ApplicationRecord
  belongs_to :workspace

  validates :source_type, presence: true
  validates :source_id,   presence: true
  validates :content,     presence: true
  validates :chunk_index, numericality: { greater_than_or_equal_to: 0 }

  # pgvector nearest-neighbor search
  # Uses neighbor gem: has_neighbors :embedding, dimensions: 1024
  has_neighbors :embedding, dimensions: 1024

  scope :for_workspace, ->(workspace_id) { where(workspace_id: workspace_id) }
  scope :for_source_type, ->(type) { where(source_type: type) }

  # Cosine similarity search — used by Rag::SearchService
  def self.similar_to(vector, limit: 10)
    nearest_neighbors(:embedding, vector, distance: "cosine").limit(limit)
  end
end
```

---

## Concerns

Shared behavior goes in `app/models/concerns/`. Only create a concern if it's used by ≥ 2 models.

```ruby
# app/models/concerns/workspace_scoped.rb
# Shared by all models that belong to a workspace
module WorkspaceScoped
  extend ActiveSupport::Concern

  included do
    belongs_to :workspace
    validates :workspace, presence: true

    scope :in_workspace, ->(workspace) { where(workspace: workspace) }
  end
end
```

---

## Forbidden Patterns

```ruby
# WRONG — callback touches another model
class Spec < ApplicationRecord
  after_create :create_default_tickets  # NEVER — use a service instead

  private
  def create_default_tickets
    # This belongs in Specs::CreateService
    tickets.create!(title: "Initial setup")
  end
end

# WRONG — raw SQL in model
class Ticket < ApplicationRecord
  def self.high_priority_for(workspace)
    find_by_sql("SELECT * FROM tickets WHERE workspace_id = #{workspace.id} AND priority = 'high'")
    # Use a scope or query object instead
  end
end

# WRONG — business logic in model
class Workspace < ApplicationRecord
  def invite_user(email)
    # This belongs in Workspaces::InviteMemberService
    user = User.find_by!(email: email)
    workspace_members.create!(user: user, role: "engineer")
    UserMailer.invitation_email(user, self).deliver_later
  end
end
```
