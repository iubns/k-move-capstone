# GitHub Pages 설정 가이드

## 오류 원인
```
Error: Get Pages site failed. Please verify that the repository has Pages enabled
```

GitHub Pages가 활성화되지 않아서 배포가 실패했습니다.

## 해결 방법

### 1. GitHub 저장소로 이동
https://github.com/iubns/k-move-capstone

### 2. Settings 탭 클릭
저장소 상단 메뉴에서 **Settings** 클릭

### 3. Pages 메뉴로 이동
왼쪽 사이드바에서 **Pages** 클릭

### 4. Source 설정
**Build and deployment** 섹션에서:
- **Source**: `GitHub Actions` 선택
  
  (기본값이 "Deploy from a branch"일 수 있습니다. 반드시 **GitHub Actions**로 변경)

### 5. 저장 및 재실행
설정을 저장하면 자동으로 적용됩니다.

### 6. 워크플로우 재실행
- **Actions** 탭으로 이동
- 실패한 워크플로우 클릭
- 우측 상단 **Re-run all jobs** 버튼 클릭

## 스크린샷 가이드

```
Settings → Pages → Build and deployment
┌─────────────────────────────────────────┐
│ Source                                  │
│ ┌─────────────────────────────────────┐ │
│ │ [v] GitHub Actions              ◄───┼─┤ 이것을 선택!
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 대체 방법: 워크플로우 수정

만약 위 방법으로 안 되면, 워크플로우를 수정하여 자동으로 Pages를 활성화할 수 있습니다:

### 옵션 1: enablement 파라미터 추가

워크플로우에 다음 추가:
```yaml
- name: Setup Pages
  uses: actions/configure-pages@v4
  with:
    static_site_generator: next
    enablement: true  # 추가!
```

### 옵션 2: GitHub CLI 사용

로컬에서 실행:
```bash
# GitHub CLI 설치 필요
gh auth login

# Pages 활성화
gh api repos/iubns/k-move-capstone/pages \
  -X POST \
  -f build_type=workflow
```

## 확인 방법

Pages가 성공적으로 활성화되면:
1. Settings → Pages에서 URL이 표시됨
   ```
   Your site is live at https://iubns.github.io/k-move-capstone/
   ```

2. Actions 탭에서 워크플로우가 성공적으로 완료됨 ✅

3. 배포된 사이트 접속 가능

## 배포 URL

설정 완료 후 다음 URL에서 접속:
```
https://iubns.github.io/k-move-capstone
```

## 문제 해결

### Permission 에러가 발생하는 경우
Settings → Actions → General → Workflow permissions:
- ✅ **Read and write permissions** 선택
- ✅ **Allow GitHub Actions to create and approve pull requests** 체크

### 여전히 안 되는 경우
1. 저장소가 Public인지 확인 (Private는 GitHub Pro 필요)
2. Actions가 활성화되어 있는지 확인
3. 워크플로우 파일이 `.github/workflows/deploy.yml`에 있는지 확인

## 다음 단계

1. ✅ GitHub Settings → Pages에서 **GitHub Actions** 선택
2. ✅ Actions 탭에서 워크플로우 재실행
3. ✅ 빌드 완료 대기
4. ✅ 배포된 사이트 접속

설정 완료 후 알려주시면 다음 단계를 진행하겠습니다! 🚀
