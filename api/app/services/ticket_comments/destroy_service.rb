module TicketComments
  class DestroyService
    def initialize(comment, user:)
      @comment = comment
      @user    = user
    end

    def call
      unless @comment.author_id == @user.id
        return Result.new(success: false, error: "Cannot delete another user's comment")
      end

      @comment.destroy!
      Result.new(success: true, payload: @comment)
    rescue ActiveRecord::RecordNotDestroyed => e
      Result.new(success: false, error: e.message)
    end
  end
end
