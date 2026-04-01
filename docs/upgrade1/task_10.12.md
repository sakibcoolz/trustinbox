# Task 10.12 — Add Knowledge Source

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Knowledge management  
> **Estimated Scope**: Medium  
> **Route**: `/bots/[id]/knowledge`  
> **File**: `apps/provider/src/app/bots/[id]/knowledge/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Wire the "Add Source" form to the `addKnowledgeSource` mutation. Support all five source types (Document, URL, Text, FAQ, API) with appropriate form fields per type. Handle file upload for Document type.

---

## Current State

```tsx
// Toggle-able form at bottom of knowledge page
{showAddForm && (
  <div className="bg-bg-tertiary rounded-xl p-4 space-y-3 border border-border-primary">
    <h4 className="text-sm font-semibold">Add Knowledge Source</h4>
    <select className="w-full px-3 py-2 bg-bg-input ...">
      <option>PDF Document</option>
      <option>Web URL</option>
      <option>Plain Text</option>
    </select>
    <input type="text" placeholder="Source name" className="w-full px-3 py-2 ..." />
    <div className="border-2 border-dashed border-border-secondary rounded-xl p-8 text-center text-sm text-text-muted">
      Drop files here or click to browse
    </div>
    <button className="w-full py-2 bg-accent-purple text-white rounded-lg text-sm font-medium">
      Add Source
    </button>
  </div>
)}
```

**Issues**: Form is decorative — no mutation, file drop doesn't work, type dropdown incomplete (missing FAQ/API).

### GraphQL Schema

```graphql
input AddKnowledgeSourceInput {
  botId: ID!
  serviceProviderId: ID!
  sourceType: KnowledgeSourceType!
  name: String!
  description: String
  content: String
  s3Key: String
  fileType: String
  fileSize: Int
}

mutation { addKnowledgeSource(input: AddKnowledgeSourceInput!): KnowledgeSource! }
```

---

## Requirements

### 1. Form Fields per Source Type

| Source Type | Fields |
|------------|--------|
| **DOCUMENT** | name, description, file upload (drag-drop + browse), fileType auto-detected |
| **URL** | name, description, URL input |
| **TEXT** | name, description, content textarea |
| **FAQ** | name, description, content textarea (Q&A pairs) |
| **API** | name, description, content (API endpoint / OpenAPI spec) |

### 2. File Upload (DOCUMENT type)

- Drag-and-drop zone
- Browse file button
- Accepted: PDF, MD, TXT, DOCX
- Max size: 10MB
- Upload to S3 (or presigned URL) → set `s3Key`
- Show upload progress bar

### 3. Form Validation

| Field | Validation |
|-------|------------|
| name | Required, ≥ 2 chars |
| sourceType | Required |
| content | Required for TEXT/FAQ types |
| file | Required for DOCUMENT type |
| URL | Valid URL for URL type |

### 4. Post-submit

- Call `addKnowledgeSource` mutation
- New source appears in table with `PENDING` status
- Close form, show success toast
- Refetch knowledge sources

---

## Implementation Plan

```tsx
function AddKnowledgeSourceForm({ botId, onClose }: { botId: string; onClose: () => void }) {
  const { serviceProviderId } = useServiceProvider();
  const [addSource, { loading }] = useMutation(ADD_KNOWLEDGE_SOURCE, {
    refetchQueries: ['GetBotKnowledgeSources'],
  });

  const [form, setForm] = useState({
    sourceType: 'DOCUMENT' as KnowledgeSourceType,
    name: '',
    description: '',
    content: '',
    file: null as File | null,
  });

  async function handleSubmit() {
    let s3Key: string | undefined;
    let fileType: string | undefined;
    let fileSize: number | undefined;

    if (form.sourceType === 'DOCUMENT' && form.file) {
      // Upload file to S3 → get key
      s3Key = await uploadFile(form.file);
      fileType = form.file.name.split('.').pop();
      fileSize = form.file.size;
    }

    await addSource({
      variables: {
        input: {
          botId, serviceProviderId,
          sourceType: form.sourceType,
          name: form.name, description: form.description,
          content: form.sourceType !== 'DOCUMENT' ? form.content : undefined,
          s3Key, fileType, fileSize,
        },
      },
    });
    onClose();
  }

  return (
    <div className="bg-bg-tertiary rounded-xl p-4 space-y-3 border border-border-primary">
      {/* sourceType selector, name, description, type-specific fields */}
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-2 bg-accent-purple text-white rounded-lg text-sm font-medium disabled:opacity-50">
        {loading ? 'Adding…' : 'Add Source'}
      </button>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/knowledge/page.tsx` | **Modify** | Wire add form to GraphQL mutation |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add ADD_KNOWLEDGE_SOURCE mutation (task 10.20) |

---

## Acceptance Criteria

- [ ] Source type dropdown includes all 5 types (DOCUMENT, URL, TEXT, FAQ, API)
- [ ] Form fields change based on selected source type
- [ ] DOCUMENT type shows drag-and-drop file upload
- [ ] File upload handles PDF, MD, TXT, DOCX
- [ ] Form validation for required fields
- [ ] Calls `addKnowledgeSource` mutation on submit
- [ ] New source appears in list with PENDING status
- [ ] Success toast on creation
- [ ] Loading state during upload + mutation
- [ ] Form closes after successful submission

---

## Dependencies

- **Blocked by**: Task 10.11 (knowledge base page with real data), Task 10.20 (addKnowledgeSource mutation)
- **Blocks**: None
- **Related**: Task 10.13 (source status management), Task 10.14 (remove source)
