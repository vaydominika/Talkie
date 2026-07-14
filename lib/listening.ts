export function splitListeningPhrases(text:string){return text.split(/(?<=[.!?。！？])\s+|\n+/).map(value=>value.trim()).filter(Boolean)}
