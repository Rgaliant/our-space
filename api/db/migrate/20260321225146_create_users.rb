class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users, id: false do |t|
      t.string :id, null: false
      t.string :email, null: false
      t.string :display_name
      t.string :avatar_url
      t.timestamps
    end

    add_index :users, :email, unique: true
    execute "ALTER TABLE users ADD PRIMARY KEY (id)"
  end
end
