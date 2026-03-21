# Serializers (Blueprinter)

All JSON serialization uses Blueprinter. No `as_json`, no `to_json` with options, no `jbuilder`.

---

## Rules

1. All serializers in `app/serializers/`
2. Every serializer inherits from `Blueprinter::Base`
3. Use `view` blocks to define field sets — never expose all fields by default
4. Nest associations using `association` — never call serializer manually inside another
5. Default view is the safe minimal set; create named views for expanded data
6. Render collections with `SerializerClass.render(collection)` — Blueprinter handles arrays automatically

---

## File Structure

```
app/serializers/
├── user_serializer.rb
├── workspace_serializer.rb
├── project_serializer.rb
├── spec_serializer.rb
├── ticket_serializer.rb
├── conversation_serializer.rb
└── conversation_message_serializer.rb
```

---

## Serializer Template

```ruby
# app/serializers/spec_serializer.rb
class SpecSerializer < Blueprinter::Base
  identifier :id

  # Default view — safe minimal fields
  fields :title, :content, :status, :ai_generated, :created_at, :updated_at

  association :created_by, blueprint: UserSerializer do
    fields :id, :display_name, :avatar_url
  end

  association :project, blueprint: ProjectSerializer do
    fields :id, :name
  end

  # :with_tickets — used when rendering a spec with its tickets
  view :with_tickets do
    association :tickets, blueprint: TicketSerializer
  end

  # :summary — used in list views (no content)
  view :summary do
    excludes :content
    fields :ticket_count

    field :ticket_count do |spec|
      spec.tickets.count
    end
  end
end
```

---

## Standard Serializers

### UserSerializer

```ruby
# app/serializers/user_serializer.rb
class UserSerializer < Blueprinter::Base
  identifier :id

  fields :email, :display_name, :avatar_url, :created_at
end
```

### WorkspaceSerializer

```ruby
# app/serializers/workspace_serializer.rb
class WorkspaceSerializer < Blueprinter::Base
  identifier :id

  fields :name, :slug, :plan, :created_at

  association :owner, blueprint: UserSerializer

  view :with_members do
    association :members, blueprint: UserSerializer
  end
end
```

### ProjectSerializer

```ruby
# app/serializers/project_serializer.rb
class ProjectSerializer < Blueprinter::Base
  identifier :id

  fields :name, :description, :status, :created_at, :updated_at
end
```

### TicketSerializer

```ruby
# app/serializers/ticket_serializer.rb
class TicketSerializer < Blueprinter::Base
  identifier :id

  fields :title, :description, :status, :priority, :priority_score,
         :story_points, :position, :created_at, :updated_at

  association :assignee, blueprint: UserSerializer
  association :created_by, blueprint: UserSerializer

  field :spec_id do |ticket|
    ticket.spec_id
  end
end
```

### ConversationSerializer

```ruby
# app/serializers/conversation_serializer.rb
class ConversationSerializer < Blueprinter::Base
  identifier :id

  fields :title, :created_at, :updated_at

  view :with_messages do
    association :messages, blueprint: ConversationMessageSerializer
  end
end
```

```ruby
# app/serializers/conversation_message_serializer.rb
class ConversationMessageSerializer < Blueprinter::Base
  identifier :id

  fields :role, :content, :metadata, :created_at
end
```

---

## Rendering in Controllers

```ruby
# Single object — default view
render json: SpecSerializer.render_as_hash(@spec)

# Single object — named view
render json: SpecSerializer.render_as_hash(@spec, view: :with_tickets)

# Collection — default view
render json: SpecSerializer.render(@specs)

# Collection — named view
render json: SpecSerializer.render(@specs, view: :summary)

# With status
render json: SpecSerializer.render(result.payload), status: :created

# Wrapping in data key (matches API response format)
render json: { data: SpecSerializer.render_as_hash(@spec) }
```

### Consistent `data` wrapping

To keep all responses in `{ "data": ... }` format, wrap at render time:

```ruby
def render_resource(serializer, resource, **opts)
  render json: { data: serializer.render_as_hash(resource, **opts) }
end

def render_collection(serializer, collection, **opts)
  render json: { data: JSON.parse(serializer.render(collection, **opts)) }
end
```

Or use a concern:

```ruby
# app/controllers/concerns/json_rendering.rb
module JsonRendering
  def render_resource(serializer, resource, status: :ok, **opts)
    render json: { data: serializer.render_as_hash(resource, **opts) }, status: status
  end

  def render_collection(serializer, collection, status: :ok, **opts)
    render json: { data: JSON.parse(serializer.render(collection, **opts)) }, status: status
  end

  def render_error(message:, code:, status:, details: {})
    render json: { error: { message: message, code: code, details: details } }, status: status
  end
end
```

---

## What NOT to Do

```ruby
# WRONG — using as_json
render json: @spec.as_json(only: [:id, :title])

# WRONG — calling serializer inside another serializer manually
class SpecSerializer < Blueprinter::Base
  field :project do |spec|
    ProjectSerializer.render_as_hash(spec.project)  # Use association instead
  end
end

# WRONG — exposing all fields without a view
class SpecSerializer < Blueprinter::Base
  fields :id, :title, :content, :status, :ai_generated,
         :workspace_id, :project_id, :created_by_id,  # internal IDs should be excluded
         :created_at, :updated_at
end
```
