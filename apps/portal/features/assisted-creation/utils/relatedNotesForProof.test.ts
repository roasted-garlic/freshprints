import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  AssistedCreationProof,
  AssistedCreationRevisionEntry,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import { ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE } from '@fresh-prints/shared/utils/assistedCreationHistory';

import { notesForProof, relatedNotesForProof } from './assistedCreationDisplay';

function proof(id: string, createdAtMs: number, note?: string): AssistedCreationProof {
  return {
    id,
    storagePath: `proofs/${id}.png`,
    fileName: `${id}.png`,
    contentType: 'image/png',
    sizeBytes: 100,
    createdAt: new Date(createdAtMs),
    createdBy: 'staff-1',
    note,
  };
}

function historyEntry(
  atMs: number,
  note: string,
  byRole: AssistedCreationRevisionEntry['byRole'],
  toStatus: AssistedCreationRevisionEntry['toStatus'] = 'revision_requested',
): AssistedCreationRevisionEntry {
  return {
    at: new Date(atMs),
    byRole,
    byUid: 'u1',
    fromStatus: 'proof_ready',
    toStatus,
    note,
  };
}

describe('relatedNotesForProof', () => {
  it('includes non-boilerplate notes between this proof and the next', () => {
    const proofs = [proof('p1', 1000, 'Staff proof note'), proof('p2', 5000)];
    const history = [
      historyEntry(1500, 'Please darken the blue', 'customer'),
      historyEntry(2000, 'Customer approved proof', 'customer', 'approved'),
      historyEntry(3000, 'Got it — revising', 'staff', 'in_progress'),
      historyEntry(6000, 'After next proof', 'customer'),
    ];
    const notes = relatedNotesForProof(proofs[0], proofs, history);
    assert.equal(notes.length, 2);
    assert.match(notes[0], /^You ·/);
    assert.match(notes[0], /Please darken the blue/);
    assert.match(notes[1], /^Fresh Prints ·/);
    assert.match(notes[1], /Got it — revising/);
  });

  it('excludes proof-ready email system notes', () => {
    const proofs = [proof('p1', 1000)];
    const history = [
      historyEntry(1200, ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE, 'system', 'proof_ready'),
      historyEntry(1500, 'Please darken the blue', 'customer'),
    ];
    const notes = relatedNotesForProof(proofs[0], proofs, history);
    assert.equal(notes.length, 1);
    assert.match(notes[0], /Please darken the blue/);
  });

  it('returns empty when only boilerplate exists in the window', () => {
    const proofs = [proof('p1', 1000)];
    const history = [historyEntry(1500, 'Customer approved proof', 'customer', 'approved')];
    assert.deepEqual(relatedNotesForProof(proofs[0], proofs, history), []);
  });
});

describe('notesForProof', () => {
  it('prepends the staff proof note then linked history notes', () => {
    const proofs = [proof('p1', 1000, 'Looks good so far')];
    const history = [historyEntry(1500, 'Please darken the blue', 'customer')];
    const notes = notesForProof(proofs[0], proofs, history);
    assert.equal(notes.length, 2);
    assert.match(notes[0], /^Fresh Prints ·/);
    assert.match(notes[0], /Looks good so far/);
    assert.match(notes[1], /Please darken the blue/);
  });

  it('does not duplicate proof.note when history repeats the same text', () => {
    const proofs = [proof('p1', 1000, 'This be it')];
    const history = [
      historyEntry(1100, 'This be it', 'staff', 'proof_ready'),
      historyEntry(2000, 'Looks great — approved', 'customer', 'approved'),
    ];
    const notes = notesForProof(proofs[0], proofs, history);
    assert.equal(notes.length, 2);
    assert.match(notes[0], /This be it/);
    assert.match(notes[1], /Looks great — approved/);
    assert.equal(notes.filter((line) => line.includes('This be it')).length, 1);
  });
});
