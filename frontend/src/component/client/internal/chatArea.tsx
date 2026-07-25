import { formatDateTimeWithSeconds } from "@/utils/format/date";
import { BotIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import TypingDots from "./typingAnimation";
import { normalizeEmphasis } from "@/utils/format/markdown";

const ClientInternalChatArea = ({ chatList }) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatList]);

  return (
    <>
      <div className="w-full py-5 pb-16 p-3 h-[calc(100%-64px)]">
        <div className="w-full h-full pt-12 px-2 md:px-5 flex flex-col gap-3 overflow-y-auto">
          {chatList.map((chat, idx) => (
            <div
              key={idx}
              className={`w-full flex flex-row gap-3 items-start
              ${chat.type == "bot" || chat.type == "changed" ? "justify-start" : "justify-end"}`}
            >
              {(chat.type == "bot" || chat.type == "changed") && (
                <div className={`hidden md:flex items-center justify-center rounded-full h-8 w-8 shrink-0 ${chat.type == "bot" ? "bg-textMain" : ""}`}>
                  {chat.type == "bot" && <BotIcon className="text-white w-5 h-5" />}
                </div>
              )}
              <div className={`flex flex-col gap-1 w-full md:max-w-[90%] ${chat.type == "bot" || chat.type == "changed" ? "items-start" : "items-end"}`}>
                <div className={`flex flex-col border rounded-xl p-3 w-fit max-w-full text-sm markdown-body ${chat.type == "bot" || chat.type == "changed" ? "bg-white" : "bg-textMain text-white"}`}>
                  {chat.isLoading && !chat.message ? <TypingDots /> : (
                    <ReactMarkdown
                      remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkBreaks]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        table: ({ children, ...props }) => (
                          <div className="overflow-x-auto">
                            <table {...props}>{children}</table>
                          </div>
                        ),
                        pre: ({ children, ...props }) => (
                          <div className="overflow-x-auto">
                            <pre {...props}>{children}</pre>
                          </div>
                        ),
                      }}
                    >
                      {normalizeEmphasis(chat.message)}
                    </ReactMarkdown>
                  )}
                </div>
                <div className={`w-full flex flex-col ${chat.type == "user" ? "items-end" : "items-start"}`}>
                  <span className="px-3 text-xs text-iconMain">
                    {chat.created_at && formatDateTimeWithSeconds(chat.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  );
};

export default ClientInternalChatArea;
