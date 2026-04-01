'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import { useMutation } from '@apollo/client';
import {
  ADD_CUSTOMER_NOTE,
  UPDATE_CUSTOMER_NOTE,
  DELETE_CUSTOMER_NOTE,
  ADD_CUSTOMER_TAG,
  REMOVE_CUSTOMER_TAG,
  useCustomerNotes,
  useCustomerTags,
  type CustomerNote,
  type CustomerTag,
} from '@/lib/graphql/customers';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { formatRelativeTime } from '@/lib/format';

// ─── Predefined Tags ───────────────────────────────────

const PREDEFINED_TAGS = ['VIP', 'High Priority', 'Needs Follow-up', 'Escalated', 'New Customer'];

// ─── Notes Section ──────────────────────────────────────

interface CustomerNotesProps {
  virtualId: string;
}

export function CustomerNotesSection({ virtualId }: CustomerNotesProps) {
  const { data, refetch } = useCustomerNotes(virtualId);
  const notes = data?.customerNotes ?? [];
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const canDeleteOthers = usePermission('settings:team:manage');

  const [addNote] = useMutation(ADD_CUSTOMER_NOTE);
  const [updateNote] = useMutation(UPDATE_CUSTOMER_NOTE);
  const [deleteNote] = useMutation(DELETE_CUSTOMER_NOTE);

  async function handleAdd() {
    if (!content.trim()) return;
    await addNote({ variables: { virtualId, content: content.trim() } });
    setContent('');
    setShowForm(false);
    refetch();
  }

  async function handleUpdate(id: string) {
    if (!editContent.trim()) return;
    await updateNote({ variables: { id, content: editContent.trim() } });
    setEditingId(null);
    refetch();
  }

  async function handleDelete(id: string) {
    await deleteNote({ variables: { id } });
    refetch();
  }

  return (
    <Card>
      <CardHeader
        title="Internal Notes"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
          >
            <Plus size={13} /> Add note
          </button>
        }
      />
      <CardContent>
        {showForm && (
          <div className="mb-4 space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
              placeholder="Add a note…"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!content.trim()}
                className="px-3 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setShowForm(false); setContent(''); }}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <p className="text-sm text-text-muted">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-bg-hover rounded-lg group">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(note.id)} className="text-xs text-accent-blue hover:text-accent-blue/80">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-text-muted hover:text-text-primary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-text-primary">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-muted">
                        {note.authorName} · {formatRelativeTime(note.createdAt)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                          className="p-1 text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        {canDeleteOthers && (
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-text-muted hover:text-status-error transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tags Section ───────────────────────────────────────

interface CustomerTagsProps {
  virtualId: string;
}

export function CustomerTagsSection({ virtualId }: CustomerTagsProps) {
  const { data, refetch } = useCustomerTags(virtualId);
  const tags = data?.customerTags ?? [];
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTag, setNewTag] = useState('');
  const canManageTags = usePermission('settings:team:manage');

  const [addTag] = useMutation(ADD_CUSTOMER_TAG);
  const [removeTag] = useMutation(REMOVE_CUSTOMER_TAG);

  async function handleAdd(label: string) {
    await addTag({ variables: { virtualId, label } });
    setShowDropdown(false);
    setNewTag('');
    refetch();
  }

  async function handleRemove(tagId: string) {
    await removeTag({ variables: { virtualId, tagId } });
    refetch();
  }

  const existingLabels = new Set(tags.map((t) => t.label));
  const suggestions = PREDEFINED_TAGS.filter((t) => !existingLabels.has(t));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag size={13} className="text-text-muted" />
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary text-text-secondary rounded-full text-xs"
        >
          {tag.label}
          <button onClick={() => handleRemove(tag.id)} className="hover:text-status-error transition-colors">
            <X size={11} />
          </button>
        </span>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 px-2 py-0.5 border border-dashed border-border-secondary text-text-muted rounded-full text-xs hover:text-text-primary hover:border-border-active transition-colors"
        >
          <Plus size={11} /> Add tag
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-bg-card border border-border-primary rounded-lg shadow-lg z-20 p-2 space-y-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) handleAdd(newTag.trim());
              }}
              className="w-full px-2 py-1 bg-bg-input border border-border-secondary rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Type or select…"
              autoFocus
            />
            {suggestions
              .filter((s) => !newTag || s.toLowerCase().includes(newTag.toLowerCase()))
              .map((s) => (
                <button
                  key={s}
                  onClick={() => handleAdd(s)}
                  className="w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
                >
                  {s}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
