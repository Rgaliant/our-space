class CreateGithubRepositories < ActiveRecord::Migration[8.0]
  def change
    create_table :github_repositories do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :project, null: true, foreign_key: true
      t.string :connected_by_id, null: false
      t.string :github_repo_id, null: false
      t.string :full_name, null: false
      t.string :name, null: false
      t.text :description
      t.string :default_branch, null: false, default: "main"
      t.boolean :private, null: false, default: false
      t.datetime :last_synced_at
      t.string :sync_status, null: false, default: "pending"
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :github_repositories, [ :workspace_id, :full_name ], unique: true
    add_index :github_repositories, :connected_by_id
    add_index :github_repositories, :sync_status
    add_foreign_key :github_repositories, :users, column: :connected_by_id
  end
end
