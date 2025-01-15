export const detectUrl = (text: string) => {
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  return urlPattern.test(text);
};

export const detectSearchIntent = (text: string) => {
  const searchPatterns = [
    /^(search|find|look up|tell me about|what is|who is|where is|when|how to)/i,
    /\?(search|find|look up|tell me about|what is|who is|where is|when|how to)/i,
    /can you (search|find|look up|tell me about)/i
  ];
  return searchPatterns.some(pattern => pattern.test(text));
};