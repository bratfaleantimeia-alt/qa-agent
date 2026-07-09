/**
 * Generates the system prompt for the Gemini AI model to analyze a Jira user story and return structured QA test cases.
 * This template is modularized so that prompts can be managed independently of the application logic.
 * * @param storyTitle - The summary/title of the Jira issue
 * @param storyDescription - The full description of the Jira issue
 * @returns The formatted prompt string
 */
export function getQAPrompt(storyTitle: string, storyDescription: string): string {
  return `
    You are a Senior QA Engineer. Analyze the following User Story from Jira and generate detailed and structured test cases.
    Your response MUST be a valid JSON object with no other conversational text surrounding it.
    
    The strict JSON structure you MUST follow is:
    {
      "testCases": [
        {
          "id": "TC001",
          "type": "Positive",
          "title": "Short title of the test case",
          "preconditions": "Necessary preconditions (if any, otherwise leave empty)",
          "steps": "1. First step\\n2. Second step\\n3. Third step",
          "expectedResult": "Detailed expected result"
        }
      ]
    }
    
    Allowed values for 'type': 'Positive', 'Negative', 'Edge Case'.
    
    Here are the Jira issue details:
    --------------------------------------------------
    Story Title: ${storyTitle}
    Story Description: ${storyDescription}
    --------------------------------------------------
    
    Please write all generated text in English.
  `;
}