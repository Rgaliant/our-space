Result = Struct.new(:success, :payload, :error, keyword_init: true) do
  def success? = success
  def failure? = !success
end
