#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <release-asset-file>" >&2
  exit 2
fi

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"
: "${RELEASE_TARGET_SHA:?RELEASE_TARGET_SHA is required}"
: "${UPLOAD_URL:?UPLOAD_URL is required}"

FILE="$1"
NAME="$(basename "$FILE")"
LOCAL_SIZE="$(wc -c < "$FILE" | tr -d '[:space:]')"
MAX_ATTEMPTS="${RELEASE_ASSET_MAX_ATTEMPTS:-5}"

is_transient_http() {
  case "$1" in
    429|500|502|503|504) return 0 ;;
    *) return 1 ;;
  esac
}

backoff_seconds() {
  case "$1" in
    1) echo 5 ;;
    2) echo 15 ;;
    3) echo 30 ;;
    *) echo 60 ;;
  esac
}

release_metadata() {
  gh api "repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}"
}

assert_expected_release() {
  local metadata actual_upload_url
  metadata="$(release_metadata)"
  actual_upload_url="$(echo "$metadata" | jq -r '.upload_url' | sed 's/{?name,label}//')"
  if [ "$actual_upload_url" != "$UPLOAD_URL" ] || ! echo "$metadata" | jq -e \
    --arg expected_sha "$RELEASE_TARGET_SHA" \
    '.draft == true and .target_commitish == $expected_sha' >/dev/null; then
    echo "::error::Release identity changed or does not match the expected draft: release_id=${RELEASE_ID} expected_sha=${RELEASE_TARGET_SHA}" >&2
    exit 1
  fi
}

asset_record() {
  gh api "repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}/assets" |
    jq -r --arg name "$NAME" \
      'first(.[] | select(.name == $name) | [(.id | tostring), (.size | tostring), (.state // "")] | @tsv) // ""'
}

asset_is_valid() {
  local record asset_id asset_size asset_state
  record="$(asset_record)"
  [ -n "$record" ] || return 1
  IFS=$'\t' read -r asset_id asset_size asset_state <<< "$record"
  [ -n "$asset_id" ] && [ "$asset_state" = "uploaded" ] && [ "$asset_size" = "$LOCAL_SIZE" ]
}

remove_same_name_asset() {
  local record asset_id
  record="$(asset_record)"
  [ -n "$record" ] || return 0
  asset_id="${record%%$'\t'*}"
  if [ -n "$asset_id" ] && [ "$asset_id" != "null" ]; then
    echo "Removing same-name asset ${NAME} from exact release_id=${RELEASE_ID} (asset_id=${asset_id})"
    gh api --method DELETE "repos/${GITHUB_REPOSITORY}/releases/assets/${asset_id}" >/dev/null
  fi
}

BODY_FILE="$(mktemp)"
ERROR_FILE="$(mktemp)"
cleanup_temp_files() {
  rm -f "$BODY_FILE" "$ERROR_FILE"
}
trap cleanup_temp_files EXIT

for ((attempt = 1; attempt <= MAX_ATTEMPTS; attempt++)); do
  assert_expected_release

  if asset_is_valid; then
    echo "Keeping already-valid ${NAME} on exact release_id=${RELEASE_ID}"
    exit 0
  fi

  # Remove only a partial or mismatched same-name asset from this exact release.
  remove_same_name_asset
  : > "$BODY_FILE"
  : > "$ERROR_FILE"
  echo "Uploading ${NAME} -> release_id=${RELEASE_ID} attempt=${attempt}/${MAX_ATTEMPTS}"

  CURL_EXIT=0
  HTTP_CODE=""
  if HTTP_CODE="$(curl -sS \
    --connect-timeout 20 \
    --max-time 300 \
    -o "$BODY_FILE" \
    -w "%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"${FILE}" \
    "${UPLOAD_URL}?name=${NAME}" 2>"$ERROR_FILE")"; then
    CURL_EXIT=0
  else
    CURL_EXIT=$?
  fi

  if [ "$CURL_EXIT" -eq 0 ] && { [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; }; then
    if asset_is_valid; then
      echo "Verified ${NAME} on exact release_id=${RELEASE_ID}"
      exit 0
    fi
    FAILURE_REASON="HTTP ${HTTP_CODE} succeeded but exact-release asset verification failed"
    TRANSIENT=1
  elif [ "$CURL_EXIT" -ne 0 ]; then
    FAILURE_REASON="network/curl failure exit=${CURL_EXIT}"
    TRANSIENT=1
  elif is_transient_http "$HTTP_CODE"; then
    FAILURE_REASON="transient HTTP ${HTTP_CODE}"
    TRANSIENT=1
  else
    echo "::error::Non-transient asset upload failure for ${NAME} http=${HTTP_CODE}" >&2
    cat "$BODY_FILE" >&2 || true
    cat "$ERROR_FILE" >&2 || true
    exit 1
  fi

  echo "::warning::Asset upload attempt failed for ${NAME}: ${FAILURE_REASON}" >&2
  cat "$BODY_FILE" >&2 || true
  cat "$ERROR_FILE" >&2 || true
  remove_same_name_asset

  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo "::error::Asset upload exhausted ${MAX_ATTEMPTS} attempts for ${NAME} on release_id=${RELEASE_ID}; last failure: ${FAILURE_REASON}" >&2
    exit 1
  fi

  delay="$(backoff_seconds "$attempt")"
  echo "Retrying ${NAME} after ${delay}s; release_id=${RELEASE_ID} remains pinned"
  sleep "$delay"
done

echo "::error::Unreachable upload state for ${NAME}" >&2
exit 1
