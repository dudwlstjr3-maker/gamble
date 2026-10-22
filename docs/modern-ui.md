# Modern UI 검토 자료

## 결과

- 차콜·남색 패널, 1px 경계선, 바이올렛 포인트와 같은 구조의 라이트 테마.
- IBM Plex Sans KR, tabular-nums, SVG 게임 탭, 큰 잔액 헤더, safe-area를 반영한 하단 액션 바.
- 평면 카드·칩 버튼, 규칙 배지, 200ms 모션과 reduced-motion 대응.
- 바카라 쪼기 중에는 비활성 베팅 바 대신 쪼기 조작을 하단에 표시.
- 기록판은 통계 패널과 옅은 격자, 전광판은 큰 제목·수치·마커로 구성.
- 기존 `<script>` 전체, 기존 시험과 의존성은 원본과 동일. 기능·배당·난수·저장·기록 계산 변경 없음.

## 검증

- 기준 main: `bbf12998af74eab4c2a910dbdd2a91f817fa1c92`.
- 가져온 게임 원본: `feat/game-room`의 `dcfdb410e9792b3126e6f30380c42f8d362ae7d0`.
- 인라인 JS SHA-256: `ded1b7c8a209566f96e4d4e87bebf8d4077a08b49bc2697d94ebd6c0ad904523` (원본과 동일).
- `npm ci`: 성공.
- `npx playwright install chromium`: cdn.playwright.dev 다운로드가 환경 도메인 정책의 403으로 실패. 저장소가 지원하는 `/usr/bin/chromium` 151.0.7922.173 사용.
- 추가 레이아웃 시험: **16/16 통과** (320·360·390·430px × 라이트·다크). 고정 헤더·하단 조작 접근성, 가로 넘침, 마인 보드 가림 검사.
- 쪼기 영역 수정 후 집중 시험: **320-light 1/1 통과**.
- 첫 전체 실행: 112 통과, 수정 전 쪼기 2건 실패, 2건 중단, 92건 미실행. CSS 수정을 마친 뒤 최종 파일로 재실행하기 위해 중단했으며 전체 통과로 간주하지 않음.
- `git diff --check`: 통과.
- 스크린샷: 아래 56장. 동일 고정 결과·기록, 390×844 / 1440×900, 라이트·다크. 기존 시험과 동일하게 Google Fonts 요청을 차단하고 시스템 한글 산세리프 폴백으로 촬영.

## 전후 스크린샷

현재 after 이미지는 마지막 블랙잭 간격 축소와 TV 격자 높이 축소 직전 촬영본이다. **최종 재촬영 필요**. 나머지 게임의 구조와 테마 비교에 사용할 수 있다.

| 화면 | 390 다크 | 390 라이트 | 1440 다크 | 1440 라이트 |
| --- | --- | --- | --- | --- |
| 블랙잭 | [전](screenshots/before-390x844-dark-blackjack.png) / [후](screenshots/after-390x844-dark-blackjack.png) | [전](screenshots/before-390x844-light-blackjack.png) / [후](screenshots/after-390x844-light-blackjack.png) | [전](screenshots/before-1440x900-dark-blackjack.png) / [후](screenshots/after-1440x900-dark-blackjack.png) | [전](screenshots/before-1440x900-light-blackjack.png) / [후](screenshots/after-1440x900-light-blackjack.png) |
| 바카라 | [전](screenshots/before-390x844-dark-baccarat.png) / [후](screenshots/after-390x844-dark-baccarat.png) | [전](screenshots/before-390x844-light-baccarat.png) / [후](screenshots/after-390x844-light-baccarat.png) | [전](screenshots/before-1440x900-dark-baccarat.png) / [후](screenshots/after-1440x900-dark-baccarat.png) | [전](screenshots/before-1440x900-light-baccarat.png) / [후](screenshots/after-1440x900-light-baccarat.png) |
| 홀짝 | [전](screenshots/before-390x844-dark-oddeven.png) / [후](screenshots/after-390x844-dark-oddeven.png) | [전](screenshots/before-390x844-light-oddeven.png) / [후](screenshots/after-390x844-light-oddeven.png) | [전](screenshots/before-1440x900-dark-oddeven.png) / [후](screenshots/after-1440x900-dark-oddeven.png) | [전](screenshots/before-1440x900-light-oddeven.png) / [후](screenshots/after-1440x900-light-oddeven.png) |
| 그래프 | [전](screenshots/before-390x844-dark-crash.png) / [후](screenshots/after-390x844-dark-crash.png) | [전](screenshots/before-390x844-light-crash.png) / [후](screenshots/after-390x844-light-crash.png) | [전](screenshots/before-1440x900-dark-crash.png) / [후](screenshots/after-1440x900-dark-crash.png) | [전](screenshots/before-1440x900-light-crash.png) / [후](screenshots/after-1440x900-light-crash.png) |
| 마인 | [전](screenshots/before-390x844-dark-mines.png) / [후](screenshots/after-390x844-dark-mines.png) | [전](screenshots/before-390x844-light-mines.png) / [후](screenshots/after-390x844-light-mines.png) | [전](screenshots/before-1440x900-dark-mines.png) / [후](screenshots/after-1440x900-dark-mines.png) | [전](screenshots/before-1440x900-light-mines.png) / [후](screenshots/after-1440x900-light-mines.png) |
| 플링코 | [전](screenshots/before-390x844-dark-plinko.png) / [후](screenshots/after-390x844-dark-plinko.png) | [전](screenshots/before-390x844-light-plinko.png) / [후](screenshots/after-390x844-light-plinko.png) | [전](screenshots/before-1440x900-dark-plinko.png) / [후](screenshots/after-1440x900-dark-plinko.png) | [전](screenshots/before-1440x900-light-plinko.png) / [후](screenshots/after-1440x900-light-plinko.png) |
| 바카라 전광판 | [전](screenshots/before-390x844-dark-board.png) / [후](screenshots/after-390x844-dark-board.png) | [전](screenshots/before-390x844-light-board.png) / [후](screenshots/after-390x844-light-board.png) | [전](screenshots/before-1440x900-dark-board.png) / [후](screenshots/after-1440x900-dark-board.png) | [전](screenshots/before-1440x900-light-board.png) / [후](screenshots/after-1440x900-light-board.png) |

## 가정

- main에는 .gitignore만 있었으므로 사용자 승인에 따라 main에서 분기 후 feat/game-room 원본을 가져왔다. main과 비교하면 기존 게임 파일도 추가로 보인다.
- 칩 버튼은 기존처럼 금액을 더하는 순간 동작이다. 지속적인 선택 상태를 새로 만들지 않고 눌림·포커스 피드백을 제공한다.
- 잔액은 기존 JS가 설정하는 up 클래스에 200ms 상승 모션을 적용한다. 숫자 보간을 위한 JS는 추가하지 않았다.
- 다크 토큰을 기본으로 하고 OS의 라이트 설정과 기존 data-theme 속성을 지원한다. 테마 전환 기능은 추가하지 않았다.

## 남은 문제 / 인계

최종 스크린샷 실행 요청이 자동 승인 시스템의 사용 한도 오류로 실행되지 않았다. 안전성 판단에 따른 거절이 아니라 승인 검토 자체의 실패였다. 검증 완료 전에는 초안 PR 상태를 유지한다.

1. 전체 시험을 최종 파일로 다시 실행: `npm ci`, `npx playwright install chromium`, `npm test` (총 224개).
2. `node tests/server.cjs`를 켠 뒤 `node docs/capture.cjs after`로 최종 32장 촬영. 기본 28장 외 바카라 쪼기 4장이 포함된다.
3. 원본을 별도 파일로 추출한 뒤 쪼기 before 추가: `git show dcfdb410e9792b3126e6f30380c42f8d362ae7d0:index.html > /tmp/gamble-before.html`, `GAMBLE_CAPTURE_ONLY=squeeze GAMBLE_CAPTURE_SOURCE=/tmp/gamble-before.html node docs/capture.cjs before`.
4. 실제 claude.ai 아티팩트와 TV의 3m 시청 거리는 아직 실기기 확인하지 않았다. 보안 iframe은 기존 시험으로 검증한다.
5. 시험·최종 이미지 결과로 이 문서와 PR을 갱신하고 GitHub 작업 브랜치에 커밋·푸시한다. main 병합은 사용자가 한다.
