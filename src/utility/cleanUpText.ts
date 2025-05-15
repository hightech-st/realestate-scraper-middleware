export const cleanUpText = (text: string): string => {
  // Step 1: Remove HTML tags and newlines
  let processed = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\\n/g, ' ') // Replace \n with space
    .replace(/\n/g, ' ') // Replace actual newlines with space
    .replace(/\r/g, ' ') // Replace carriage returns with space
    .replace(/\t/g, ' ') // Replace tabs with space
    .replace(/-----/g, ' '); // Remove separator lines

  // Step 2: Keep only letters, numbers, and spaces, comma, dot, colon, semicolon, dash, slash, and question mark remove everything else
  processed = processed.replace(/[^\p{L}\d\s,.:;-?/]/gu, ' ');

  // Step 3: Clean up multiple spaces
  processed = processed.replace(/\s+/g, ' ').trim();

  return processed;
};
