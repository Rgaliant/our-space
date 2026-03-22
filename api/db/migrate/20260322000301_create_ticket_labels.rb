class CreateTicketLabels < ActiveRecord::Migration[8.0]
  def change
    create_table :ticket_labels do |t|
      t.references :ticket, null: false, foreign_key: true
      t.references :label, null: false, foreign_key: true
      t.timestamps
    end

    add_index :ticket_labels, [ :ticket_id, :label_id ], unique: true
  end
end
