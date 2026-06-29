# ElevenLabs Tool Configuration Instructions

## Configure the Tool Using the UI (NOT JSON paste)

Instead of pasting JSON, configure the tool step-by-step in the ElevenLabs dashboard:

### 1. Basic Information
- **Tool Name**: `analyze_question`
- **Tool Type**: Server Tool / Webhook
- **Description**: "Analyzes global perspectives on any question or statement. Use this when the user asks to analyze something or wants to know what the world thinks about a topic."

### 2. API Configuration
- **URL**: `https://what-the-world-really-thinks.vercel.app/api/voice-analyze`
- **Method**: `POST`
- **Timeout**: `60` seconds (CRITICAL - must be 60, not 20!)

### 3. Request Headers
Add one header:
- **Name**: `Content-Type`
- **Value**: `application/json`

### 4. Request Body Parameters

**Add Parameter 1:**
- **Parameter Name**: `command_type`
- **Type**: String
- **Value Type**: Constant Value
- **Constant Value**: `analyze`
- **Description**: "Command type"
- **Required**: Yes

**Add Parameter 2:**
- **Parameter Name**: `command_value`
- **Type**: String
- **Value Type**: LLM Generated / Dynamic
- **Description**: "The complete question or statement to analyze (e.g., 'Social media makes people fool', 'Vaccines are essential for public health'). Extract the full statement from user's speech."
- **Required**: Yes

**Add Parameter 3:**
- **Parameter Name**: `countries`
- **Type**: String
- **Value Type**: LLM Generated / Dynamic
- **Description**: "Optional: Comma-separated list of country names. If user mentions specific countries (e.g., 'in United States and Canada'), extract those. Otherwise leave empty for all countries. Examples: 'United States,Canada,Mexico' or 'ALL'."
- **Required**: No

### 5. Additional Settings
- **Disable Interruptions**: No (unchecked)
- **Force Pre-tool Speech**: Auto
- **Execution Mode**: Immediate

## Test the Tool

After configuration, test with voice commands like:

**All Countries:**
- "Analyze social media makes people fool"
- "What does the world think about vaccines?"

**Specific Countries:**
- "Analyze vaccines are essential for public health in United States, Canada, and Mexico"
- "What do China, India, and Japan think about climate change?"
- "Analyze social media in European countries like France, Germany, and Italy"

The agent should:
1. Extract the question and countries
2. Call the webhook
3. Wait up to 60 seconds
4. Dashboard auto-refreshes when complete

## If UI Configuration Doesn't Work

If ElevenLabs requires JSON import, try this MINIMAL version:

```json
{
  "name": "analyze_question",
  "description": "Analyzes global perspectives on any question",
  "url": "https://what-the-world-really-thinks.vercel.app/api/voice-analyze",
  "method": "POST",
  "timeout": 60,
  "headers": {
    "Content-Type": "application/json"
  },
  "parameters": {
    "command_type": {
      "type": "string",
      "value": "analyze",
      "required": true
    },
    "command_value": {
      "type": "string",
      "from_llm": true,
      "required": true
    }
  }
}
```
