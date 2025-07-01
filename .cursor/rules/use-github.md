---
description: GitHub CLI Workflow - Deadwood-AI Organization
globs:
alwaysApply: false
---

# GitHub CLI Workflow for Deadwood-AI

## Essential Workflow: From Planning to Issue Creation

### 1. Pre-Development Issue Discovery

```bash
# Always search first - avoid duplicate work
gh api "repos/deadwood-ai/deadtrees-frontend-react/issues?per_page=50" | jq '.[] | {number, title, state}'

# Search by keywords
gh issue list --search "org:deadwood-ai profile OR edit OR metadata" --limit 50

# Get specific issue details
gh api "repos/deadwood-ai/deadtrees-frontend-react/issues/[NUMBER]" | jq '{number, title, body, state}'
```

### 2. Issue Creation & Project Management

```bash
# Create comprehensive issue
gh issue create --repo deadwood-ai/deadtrees-frontend-react --title "Title" --body "$(cat << 'ISSUE_EOF'
# Detailed issue content here
ISSUE_EOF
)"

# Add to project (ID: 5 = Deadtrees.earth)
gh project item-add 5 --owner deadwood-ai --url [ISSUE_URL]

# Assign to self
gh issue edit [NUMBER] --repo deadwood-ai/deadtrees-frontend-react --add-assignee @me
```

### 3. Project Field Management

```bash
# Get project fields and options
gh project field-list 5 --owner deadwood-ai

# Get field option IDs
gh api graphql -f query='{ organization(login: "deadwood-ai") { projectV2(number: 5) { field(name: "Status") { ... on ProjectV2SingleSelectField { options { id name } } } } } }'

# Note: Project field updates often require manual UI interaction due to API limitations
```

## Quick Reference

### Project Field IDs (Deadtrees.earth Project #5)

- **Status**: `PVTSSF_lADOCXGnk84A2rfHzgr8fYM`
  - "In Progress": `47fc9ee4`
  - "Done": `98236657`
  - "backlog": `b65b9fd7`
- **Priority**: `PVTSSF_lADOCXGnk84A2rfHzgr8fZo`
  - "high": `0384b5c9`
  - "mid": `55eba4ee`
  - "low": `1ccd7037`
- **Project**: `PVTSSF_lADOCXGnk84A2rfHzgtZMYc`
  - "feature-dev": `0e47d2fc`
  - "maintenance": `5993660c`

### Authentication Setup

```bash
# Required scopes for full project management
gh auth refresh -s project
```

### Common Search Patterns

```bash
# Feature development
gh issue list --search "org:deadwood-ai profile OR edit OR update" --limit 50

# Frontend issues
gh issue list --search "org:deadwood-ai repo:deadtrees-frontend-react is:open" --limit 50

# Recent activity
gh issue list --search "org:deadwood-ai updated:>$(date -d '7 days ago' +%Y-%m-%d)" --limit 50
```

## Key Learnings

1. **Always search first** - Check existing issues before creating new ones
2. **Reference related issues** - Build upon existing discussions and requirements
3. **Use comprehensive issue descriptions** - Include technical specs, acceptance criteria, and implementation details
4. **Project field updates** - Often require manual UI interaction; CLI has limitations
5. **Authentication matters** - Ensure proper scopes for project management
6. **API vs CLI** - Use API for complex queries, CLI for basic operations
