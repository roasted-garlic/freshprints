# Plan: OCR arched text + Re-run overlay stepper

**Date:** 2026-06-25

## Goal

A. Exact dual-arc OCR (prompt v14 + validation + low-effort retry)
B. Re-run overlay stepper starts at step 1 active (not all green)

## Note

Prompt bumps to **v14** (v13 already used for required descriptions).

## Scope

- `visibleTextValidation.ts` + provider retry on implausible text
- Prompt OCR strengthening + user-prompt character check
- `isRerunInProgress` on overlay stepper (reuse optimistic enqueue stage)
