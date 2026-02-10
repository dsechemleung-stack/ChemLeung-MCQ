import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export function useQuizData(url) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: 'greedy',
      newline: '',
      complete: (results) => {
        try {
          const formattedData = results.data
            .filter(row => Object.values(row).join('').trim().length > 0)
            .map((row, index) => {
              const getVal = (name) => {
                const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
                return row[key] ? row[key] : "";
              };

              // Convert any type of line break to <br>
              const nl2br = (text) => {
                if (!text) return "";
                return text.split(/\r\n|\r|\n/).join('<br>');
              };

              // Remove option prefix (A. B. C. D.) from the beginning
              const removePrefix = (text) => {
                if (!text) return "";
                // Remove patterns like "A. ", "B. ", "C. ", "D. " from the start
                return text.replace(/^[A-D]\.\s*/i, '');
              };

              const rawQuestion = getVal('QuestionText');

              // Image logic
              const imgRegex = /[\{\(]image:(.*?)[\}\)]/i;
              const imgMatch = rawQuestion.match(imgRegex);
              const imageUrl = getVal('Pictureurl') || (imgMatch ? imgMatch[1] : null);
              const cleanQuestion = rawQuestion.replace(imgRegex, "");

              // CRITICAL FIX: Ensure truly unique IDs
              // Use the spreadsheet ID if available AND unique, otherwise use index
              const rawId = getVal('ID');
              const uniqueId = rawId && rawId.trim() !== "" 
                ? `${rawId}-${index}` // Combine ID with index for guaranteed uniqueness
                : `q-${index}`; // Fallback to index-based ID

              return {
                ID: uniqueId,
                Topic: getVal('Topic') || "Uncategorized",
                Subtopic: getVal('Subtopic') || "",
                Question: nl2br(cleanQuestion),
                OptionA: nl2br(removePrefix(getVal('OptionA'))),
                OptionB: nl2br(removePrefix(getVal('OptionB'))),
                OptionC: nl2br(removePrefix(getVal('OptionC'))),
                OptionD: nl2br(removePrefix(getVal('OptionD'))),
                CorrectOption: getVal('CorrectOption').toUpperCase().trim(),
                Explanation: nl2br(getVal('Explanation')),
                Pictureurl: imageUrl ? imageUrl.trim() : null,
                DSEcode: getVal('DSEcode') || getVal('DSECode')
              };
            });

          setQuestions(formattedData);
          setLoading(false);
        } catch (err) {
          setError("Failed to process data.");
          setLoading(false);
        }
      }
    });
  }, [url]);

  return { questions, loading, error };
}