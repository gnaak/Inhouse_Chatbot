import { SendIcon, SquareIcon } from "lucide-react";
import { useState } from "react";

const ClientInternalInputArea = ({ clientText, setClientText, isStreaming, handleSend, handleAbort }) => {
  const [focused, setFocused] = useState(false);
  const isDisabled = clientText.trim() === "";

  return (
    <div className="absolute bottom-3 py-2 px-5 md:px-8 w-full items-end justify-center flex">
      <div className={`flex flex-col gap-2 w-full border rounded-xl bg-white px-3 py-3 hover:border-gray-500 ${focused ? "border-gray-700" : "border-gray-300"}`}>
        <textarea
          rows={1}
          disabled={isStreaming}
          className="w-full focus:outline-none text-sm resize-none max-h-60 leading-6 py-1 bg-transparent disabled:cursor-not-allowed"
          placeholder={isStreaming ? "답변이 끝난 뒤 입력할 수 있어요" : "메시지를 입력하세요"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={clientText}
          onChange={(e) => {
            setClientText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isStreaming) return;
              handleSend(clientText);
            }
          }}
        />
        <div className="flex flex-row items-center justify-end gap-5">
          <div />
          {isStreaming ? (
            <button className="w-8 h-8 bg-textMain/70 flex items-center justify-center rounded-full" onClick={handleAbort}>
              <SquareIcon className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              className="w-8 h-8 bg-textMain flex items-center justify-center rounded-lg disabled:bg-textMain/40"
              disabled={isDisabled}
              onClick={() => handleSend(clientText)}
            >
              <SendIcon className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInternalInputArea;
