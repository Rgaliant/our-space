# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_03_22_000002) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vector"

  create_table "conversation_messages", force: :cascade do |t|
    t.bigint "conversation_id", null: false
    t.string "role", null: false
    t.text "content", null: false
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_conversation_messages_on_conversation_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "project_id"
    t.string "user_id", null: false
    t.string "title", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_conversations_on_project_id"
    t.index ["user_id"], name: "index_conversations_on_user_id"
    t.index ["workspace_id"], name: "index_conversations_on_workspace_id"
  end

  create_table "distillations", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "created_by_id", null: false
    t.text "north_star", null: false
    t.text "plan_content"
    t.jsonb "proposed_tickets", default: []
    t.integer "misaligned_ticket_ids", default: [], array: true
    t.string "status", default: "generating", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_distillations_on_created_by_id"
    t.index ["workspace_id", "created_at"], name: "index_distillations_on_workspace_id_and_created_at"
    t.index ["workspace_id"], name: "index_distillations_on_workspace_id"
  end

  create_table "embeddings", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "source_type", null: false
    t.bigint "source_id", null: false
    t.integer "chunk_index", default: 0, null: false
    t.text "content", null: false
    t.vector "embedding", limit: 1024
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["embedding"], name: "embeddings_embedding_idx", opclass: :vector_cosine_ops, using: :hnsw
    t.index ["source_type", "source_id"], name: "index_embeddings_on_source_type_and_source_id"
    t.index ["workspace_id", "source_type"], name: "index_embeddings_on_workspace_id_and_source_type"
    t.index ["workspace_id"], name: "index_embeddings_on_workspace_id"
  end

  create_table "feedback", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "project_id"
    t.string "source"
    t.text "content", null: false
    t.string "sentiment"
    t.string "customer_identifier"
    t.text "linked_ticket_ids", default: [], array: true
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_feedback_on_project_id"
    t.index ["workspace_id"], name: "index_feedback_on_workspace_id"
  end

  create_table "projects", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "name", null: false
    t.text "description"
    t.string "status", default: "active", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workspace_id"], name: "index_projects_on_workspace_id"
  end

  create_table "specs", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "project_id", null: false
    t.bigint "conversation_id"
    t.string "created_by_id", null: false
    t.string "title", null: false
    t.text "content", null: false
    t.string "status", default: "draft", null: false
    t.boolean "ai_generated", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_specs_on_conversation_id"
    t.index ["created_by_id"], name: "index_specs_on_created_by_id"
    t.index ["project_id"], name: "index_specs_on_project_id"
    t.index ["workspace_id"], name: "index_specs_on_workspace_id"
  end

  create_table "tickets", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "project_id", null: false
    t.bigint "spec_id"
    t.string "assignee_id"
    t.string "created_by_id", null: false
    t.string "title", null: false
    t.text "description"
    t.string "status", default: "backlog", null: false
    t.string "priority", default: "medium", null: false
    t.float "priority_score"
    t.integer "story_points"
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "distillation_id"
    t.index ["assignee_id"], name: "index_tickets_on_assignee_id"
    t.index ["created_by_id"], name: "index_tickets_on_created_by_id"
    t.index ["distillation_id"], name: "index_tickets_on_distillation_id"
    t.index ["project_id"], name: "index_tickets_on_project_id"
    t.index ["spec_id"], name: "index_tickets_on_spec_id"
    t.index ["workspace_id"], name: "index_tickets_on_workspace_id"
  end

  create_table "users", id: :string, force: :cascade do |t|
    t.string "email", null: false
    t.string "display_name"
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "workspace_members", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "user_id", null: false
    t.string "role", default: "engineer", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_workspace_members_on_user_id"
    t.index ["workspace_id", "user_id"], name: "index_workspace_members_on_workspace_id_and_user_id", unique: true
    t.index ["workspace_id"], name: "index_workspace_members_on_workspace_id"
  end

  create_table "workspaces", force: :cascade do |t|
    t.string "owner_id", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.string "plan", default: "free", null: false
    t.jsonb "context", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["owner_id"], name: "index_workspaces_on_owner_id"
    t.index ["slug"], name: "index_workspaces_on_slug", unique: true
  end

  add_foreign_key "conversation_messages", "conversations"
  add_foreign_key "conversations", "projects"
  add_foreign_key "conversations", "users"
  add_foreign_key "conversations", "workspaces"
  add_foreign_key "distillations", "users", column: "created_by_id"
  add_foreign_key "distillations", "workspaces"
  add_foreign_key "embeddings", "workspaces"
  add_foreign_key "feedback", "projects"
  add_foreign_key "feedback", "workspaces"
  add_foreign_key "projects", "workspaces"
  add_foreign_key "specs", "conversations"
  add_foreign_key "specs", "projects"
  add_foreign_key "specs", "users", column: "created_by_id"
  add_foreign_key "specs", "workspaces"
  add_foreign_key "tickets", "distillations"
  add_foreign_key "tickets", "projects"
  add_foreign_key "tickets", "specs"
  add_foreign_key "tickets", "users", column: "assignee_id"
  add_foreign_key "tickets", "users", column: "created_by_id"
  add_foreign_key "tickets", "workspaces"
  add_foreign_key "workspace_members", "users"
  add_foreign_key "workspace_members", "workspaces"
  add_foreign_key "workspaces", "users", column: "owner_id"
end
