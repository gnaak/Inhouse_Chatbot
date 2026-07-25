const TypingDots = () => {
  return (
    <div className="flex items-center gap-1 h-5">
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
    </div>
  );
};

export default TypingDots;
