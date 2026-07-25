export const convertThinkMarkers = (text: string): string =>
  text.replace(
    /<!--JT_THINK_ON-->([\s\S]*?)<!--JT_THINK_OFF-->/g,
    '<details class="thinking-block"><summary>사고 과정</summary><div class="thinking-content">$1</div></details>',
  );

export const normalizeToolBlocks = (text: string): string =>
  text
    .replace(
      /<tool_call>([\s\S]*?)<\/tool_call>/g,
      '<details class="tool-block"><summary>도구 호출</summary><div class="tool-content">$1</div></details>',
    )
    .replace(
      /<tool_response>([\s\S]*?)<\/tool_response>/g,
      '<details class="tool-block"><summary>도구 결과</summary><div class="tool-content">$1</div></details>',
    )
    .replace(/<tool_call>/g, '<details class="tool-block" open><summary>도구 호출</summary><div class="tool-content">')
    .replace(/<\/tool_call>/g, "</div></details>")
    .replace(/<tool_response>/g, '<details class="tool-block" open><summary>도구 결과</summary><div class="tool-content">')
    .replace(/<\/tool_response>/g, "</div></details>");

export const normalizeEmphasis = (text: string): string => {
  if (!text) return text;

  const segments: { code: boolean; value: string }[] = [];
  const codeRegex = /```[\s\S]*?```|`[^`\n]+`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ code: false, value: text.slice(lastIndex, match.index) });
    }
    segments.push({ code: true, value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ code: false, value: text.slice(lastIndex) });
  }

  return segments
    .map((seg) =>
      seg.code
        ? seg.value
        : seg.value
            .replace(/\*\*([^\n*]+?)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^\w*])\*([^\n*]+?)\*(?=[^\w*]|$)/g, "$1<em>$2</em>"),
    )
    .join("");
};
