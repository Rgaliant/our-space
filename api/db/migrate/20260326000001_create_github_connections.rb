class CreateGithubConnections < ActiveRecord::Migration[8.0]
  def change
    create_table :github_connections do |t|
      t.string :user_id, null: false
      t.string :access_token, null: false
      t.string :github_login, null: false
      t.string :github_user_id, null: false
      t.string :scopes

      t.timestamps
    end

    add_index :github_connections, :user_id, unique: true
    add_index :github_connections, :github_user_id
    add_foreign_key :github_connections, :users
  end
end
