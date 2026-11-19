#!/usr/bin/env python3
"""One-time, owner-authorised metadata correction for two identified inbox uploads."""
from __future__ import annotations
import hashlib
import json
import os
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPAIRS = {
    'inbox/website__Hy4__2026-11-19__v1.zip': {
        'blob_sha': '28ec52ffd57d06be9b52e57f5223a029c0394368',
        'model': 'hy4',
        'display': 'Hy4',
    },
    'inbox/website__Hy4_flash__2026-11-19__v1.zip': {
        'blob_sha': '75802e77084df008acc7f45bbf87da5515bd0833',
        'model': 'hy4-flash',
        'display': 'Hy4 Flash',
    },
}

def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def repair(relative_path: str, spec: dict) -> None:
    path = ROOT / relative_path
    if not path.exists():
        print(f'SKIP {relative_path}: no longer in inbox (already processed or absent)')
        return
    original = path.read_bytes()
    actual_sha = git_blob_sha(original)
    if actual_sha != spec['blob_sha']:
        raise RuntimeError(f'{relative_path}: source blob changed; expected {spec["blob_sha"]}, got {actual_sha}')
    with zipfile.ZipFile(path, 'r') as source:
        infos = source.infolist()
        metadata = [i for i in infos if Path(i.filename).name == 'meta.json']
        if len(metadata) != 1:
            raise RuntimeError(f'{relative_path}: expected exactly one meta.json, found {len(metadata)}')
        meta_info = metadata[0]
        meta = json.loads(source.read(meta_info).decode('utf-8'))
        expected = {'model': 'unknown-model', 'category': 'website', 'date': '2026-11-19', 'version': 1}
        for key, value in expected.items():
            if meta.get(key) != value:
                raise RuntimeError(f'{relative_path}: unexpected meta.json {key}: {meta.get(key)!r}')
        meta['model'] = spec['model']
        notes = str(meta.get('notes', '')).strip()
        stale = "Model identity not exposed by runtime, so 'unknown-model' is used per instructions."
        correction = f"Model identity confirmed by the operator as {spec['display']}."
        if stale in notes:
            notes = notes.replace(stale, correction)
        elif correction not in notes:
            notes = (notes + ' ' + correction).strip()
        meta['notes'] = notes
        replacement = json.dumps(meta, ensure_ascii=False, indent=2).encode('utf-8') + b'\n'
        fd, temp_name = tempfile.mkstemp(prefix=path.name + '.', suffix='.tmp', dir=path.parent)
        os.close(fd)
        try:
            with zipfile.ZipFile(temp_name, 'w') as target:
                target.comment = source.comment
                for info in infos:
                    data = replacement if info is meta_info else source.read(info)
                    target.writestr(info, data)
            with zipfile.ZipFile(temp_name, 'r') as check:
                bad = check.testzip()
                if bad:
                    raise RuntimeError(f'{relative_path}: archive integrity check failed at {bad}')
                verified = json.loads(check.read(meta_info.filename).decode('utf-8'))
                if verified.get('model') != spec['model']:
                    raise RuntimeError(f'{relative_path}: corrected model did not persist')
            os.replace(temp_name, path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
    print(f'REPAIRED {relative_path}: model={spec["model"]}, original_blob={actual_sha}, new_blob={git_blob_sha(path.read_bytes())}')

if __name__ == '__main__':
    for filename, details in REPAIRS.items():
        repair(filename, details)
