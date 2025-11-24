# Frontend Emoji Integration Guide

## Overview

The backend now provides a centralized, structured endpoint to fetch all emojis for the application. This approach ensures a consistent emoji set across the platform, improves performance by avoiding manual parsing on startup, and removes the need for hardcoded emoji lists on the frontend.

This document outlines how to integrate with the new emoji API endpoint.

---

## API Endpoint Details

To fetch the emoji configuration, make a GET request to the following endpoint:

- **Method:** `GET`
- **URL:** `/api/user/config/emojis`

---

## Success Response (200 OK)

The endpoint will return a JSON object containing two main properties: `categorized` and `fullSet`.

### 1. `categorized`

This is an array of emoji groups, structured to make it easy to build a categorized emoji picker (similar to what you'd find in WhatsApp or other messaging apps).

**Structure:**

```
Array<Group>
```

- **`Group` Object:**
  - `name` (string): The name of the top-level group (e.g., "Smileys & Emotion").
  - `categories` (Array<Category>): An array of categories within this group.

- **`Category` Object:**
  - `name` (string): The name of the subgroup (e.g., "face-smiling").
  - `emojis` (Array<Emoji>): An array of emoji objects in this category.

- **`Emoji` Object:**
  - `char` (string): The actual emoji character.
  - `name` (string): The official descriptive name of the emoji.

### 2. `fullSet`

This is a simple, flat array containing every unique emoji character as a string. It is useful for tasks that don't require categorization, such as validating user input (like the 4-emoji PIN).

**Structure:**

```
Array<string>
```

---

## Example Response

Here is a truncated example of the JSON response from the `GET /api/user/config/emojis` endpoint:

```json
{
  "categorized": [
    {
      "name": "Smileys & Emotion",
      "categories": [
        {
          "name": "face-smiling",
          "emojis": [
            {
              "char": "😀",
              "name": "grinning face"
            },
            {
              "char": "😃",
              "name": "grinning face with big eyes"
            },
            {
              "char": "😄",
              "name": "grinning face with smiling eyes"
            }
          ]
        },
        {
          "name": "face-affection",
          "emojis": [
            {
              "char": "🥰",
              "name": "smiling face with hearts"
            },
            {
              "char": "😍",
              "name": "smiling face with heart-eyes"
            }
          ]
        }
      ]
    },
    {
      "name": "People & Body",
      "categories": [
        {
          "name": "hand-fingers-open",
          "emojis": [
            {
              "char": "👋",
              "name": "waving hand"
            },
            {
              "char": "🤚",
              "name": "raised back of hand"
            }
          ]
        }
      ]
    }
  ],
  "fullSet": [
    "😀", "😃", "😄", "🥰", "😍", "👋", "🤚", "..."
  ]
}
```

---

## Frontend Implementation Example

Here is a basic example of how to fetch and render the categorized emojis in a React application.

```jsx
import React, { useState, useEffect } from 'react';

// 1. Fetching the emoji data from the API
async function getEmojiData() {
  try {
    const response = await fetch('/api/user/config/emojis');
    if (!response.ok) {
      throw new Error('Failed to fetch emojis');
    }
    const data = await response.json();
    return data.categorized;
  } catch (error) {
    console.error('Error fetching emojis:', error);
    return []; // Return an empty array on error
  }
}

// 2. A simple React component to render the emoji picker
function EmojiPicker() {
  const [emojiGroups, setEmojiGroups] = useState([]);

  useEffect(() => {
    getEmojiData().then(setEmojiGroups);
  }, []);

  if (!emojiGroups.length) {
    return <div>Loading emojis...</div>;
  }

  return (
    <div className="emoji-picker">
      {emojiGroups.map(group => (
        <section key={group.name} className="emoji-group">
          <h2 className="group-name">{group.name}</h2>
          {group.categories.map(category => (
            <div key={category.name} className="emoji-category">
              <h3 className="category-name">{category.name}</h3>
              <div className="emojis">
                {category.emojis.map(emoji => (
                  <span
                    key={emoji.char}
                    title={emoji.name}
                    className="emoji"
                    onClick={() => console.log(`Selected: ${emoji.char}`)}
                  >
                    {emoji.char}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export default EmojiPicker;
```

---

## Important Notes

- **Unique Emojis:** The provided emoji list has been filtered to exclude all skin-tone and gender variations. This provides a clean, base set of emojis to work with.
- **Deprecated Sets:** Any previously hardcoded emoji sets on the frontend (e.g., `SPIRITUAL_SET`, `MUDRA_SET`) are now deprecated and should be removed. The new `categorized` data from this API should be used instead.
