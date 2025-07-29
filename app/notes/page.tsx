'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit3, Save, X, FileText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (noteData: Partial<Note>, isNew: boolean = false) => {
    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/notes' : `/api/notes/${noteData.id}`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          setNotes(prev => [data.note, ...prev]);
        } else {
          setNotes(prev => prev.map(note => note.id === noteData.id ? data.note : note));
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
    return false;
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) return;
    
    const success = await saveNote({
      title: newNote.title,
      content: newNote.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, true);

    if (success) {
      setNewNote({ title: '', content: '' });
      setShowNewNoteForm(false);
    }
  };

  const handleUpdateNote = async (noteId: number, title: string, content: string) => {
    const success = await saveNote({
      id: noteId,
      title,
      content,
      updatedAt: new Date().toISOString(),
    });

    if (success) {
      setEditingNote(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Notepad
            </h1>
          </div>
          
          <button
            onClick={() => setShowNewNoteForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>
        <p className="text-gray-600">Jot down your thoughts and ideas 📝</p>
      </div>

      {/* New Note Form */}
      {showNewNoteForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Create New Note</h2>
            <button
              onClick={() => {
                setShowNewNoteForm(false);
                setNewNote({ title: '', content: '' });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Note title..."
              value={newNote.title}
              onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
            />
            
            <textarea
              placeholder="Start writing your note..."
              value={newNote.content}
              onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-vertical"
            />
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewNoteForm(false);
                  setNewNote({ title: '', content: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newNote.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isEditing={editingNote === note.id}
            onEdit={() => setEditingNote(note.id)}
            onSave={(title, content) => handleUpdateNote(note.id, title, content)}
            onCancel={() => setEditingNote(null)}
            onDelete={() => deleteNote(note.id)}
            formatDate={formatDate}
          />
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No notes yet</h3>
          <p className="text-gray-400 mb-4">Create your first note to get started</p>
          <button
            onClick={() => setShowNewNoteForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus size={16} />
            Create Note
          </button>
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

function NoteCard({ note, isEditing, onEdit, onSave, onCancel, onDelete, formatDate }: NoteCardProps) {
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(note.title);
      setEditContent(note.content);
    }
  }, [isEditing, note.title, note.content]);

  const handleSave = () => {
    if (editTitle.trim()) {
      onSave(editTitle, editContent);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-200">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-lg mb-3"
        />
        
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] resize-vertical text-sm"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!editTitle.trim()}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Save size={14} />
              Save
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800 text-lg leading-tight">{note.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit note"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="text-gray-600 text-sm leading-relaxed mb-4 max-h-32 overflow-hidden">
        {note.content ? (
          <p className="whitespace-pre-wrap">{note.content}</p>
        ) : (
          <p className="italic text-gray-400">No content</p>
        )}
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>Updated {formatDate(note.updatedAt)}</span>
        <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit note"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}