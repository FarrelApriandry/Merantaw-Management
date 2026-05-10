export const DOC_TEMPLATES = {
  GDD: (title) => `# ${title}

## 1. Game Overview
- **Genre:**
- **Platform:**
- **Target Audience:**
- **Art Style:**

## 2. Core Gameplay
### Mechanics
- 

### Player Goals
- 

## 3. Story & Setting
### Narrative
> 

### Characters
| Name | Role | Description |
|------|------|-------------|
|      |      |             |

## 4. Level Design
- 

## 5. Art & Audio Direction
### Visual Style
- 

### Audio
- 

## 6. Technical Requirements
- Engine:
- Min Specs:

## 7. Milestones & Timeline
| Phase | Deadline | Deliverables |
|-------|----------|--------------|
|       |          |              |
`,

  SRS: (title) => `# ${title}

## 1. Introduction
### 1.1 Purpose
> 

### 1.2 Scope
> 

### 1.3 Definitions & Acronyms
| Term | Definition |
|------|-----------|
|      |           |

## 2. Overall Description
### 2.1 Product Perspective
- 

### 2.2 User Classes
- 

### 2.3 Constraints
- 

## 3. Functional Requirements
### FR-001:
- **Description:**
- **Input:**
- **Output:**
- **Priority:** High / Medium / Low

### FR-002:
- **Description:**
- **Input:**
- **Output:**
- **Priority:** High / Medium / Low

## 4. Non-Functional Requirements
### Performance
- 

### Security
- 

### Scalability
- 

## 5. System Architecture
\`\`\`
[Diagram placeholder]
\`\`\`

## 6. Appendix
- 
`,

  Wiki: (title) => `# ${title}

## Overview
> 

## Details
- 

## References
- 
`,

  "Meeting Notes": (title) => `# ${title}

**Date:** ${new Date().toLocaleDateString("id-ID")}  
**Attendees:**
- 

## Agenda
1. 

## Discussion
### Topic 1
- 

## Action Items
| Task | Assignee | Deadline |
|------|----------|----------|
|      |          |          |

## Next Meeting
- **Date:**
- **Topics:**
`,

  Other: (title) => `# ${title}

## Notes
- 
`,
};

export function getTemplate(category, title) {
  const fn = DOC_TEMPLATES[category] || DOC_TEMPLATES.Other;
  return fn(title);
}
