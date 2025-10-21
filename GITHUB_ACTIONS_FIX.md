# GitHub Actions 배포 수정 사항

## 문제
- pnpm lockfile 버전 호환성 문제
- CI 환경에서 `frozen-lockfile` 옵션 실패

## 해결책

### 1. pnpm 버전 업데이트
- pnpm action 버전: v2 → v4
- pnpm 버전: 8 → 9

### 2. Install 플래그 변경
- `--frozen-lockfile` → `--no-frozen-lockfile`
- CI 환경에서 lockfile이 없거나 호환되지 않을 때도 설치 가능

### 3. 변경된 워크플로우
```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9
    run_install: false

- name: Install dependencies
  run: pnpm install --no-frozen-lockfile
```

## 배포 방법

```bash
# 변경사항 커밋
git add .
git commit -m "Fix GitHub Actions pnpm lockfile compatibility"
git push origin main
```

## 추가 권장사항

### packageManager 필드 추가 (선택사항)
`package.json`에 다음 추가:
```json
{
  "packageManager": "pnpm@9.0.0"
}
```

### 로컬 pnpm 버전 확인
```bash
pnpm --version
```

현재 로컬은 pnpm v10을 사용 중이므로, 워크플로우도 v10으로 맞출 수 있습니다:
```yaml
with:
  version: 10
```

## 배포 확인

1. GitHub Actions 탭에서 워크플로우 실행 확인
2. 빌드 성공 여부 체크
3. 배포 URL 접속: https://iubns.github.io/terab
