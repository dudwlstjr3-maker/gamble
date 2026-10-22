# 작업 규칙 (GPT·Codex·Claude 공통)

이 저장소를 고치는 AI는 모두 이 규칙을 따른다. 사람용 설명은 README.md에 있다.

## 프로젝트

- `index.html` 한 파일짜리 가상 칩 게임룸(블랙잭·바카라·홀짝·그래프·마인·플링코). HTML·CSS·순수 JS, 빌드 도구 없음.
- GitHub Pages로 배포하고, claude.ai 아티팩트(보안이 걸린 iframe)에서도 그대로 돌아가야 한다.

## 작업 흐름

1. 항상 최신 `main`에서 새 브랜치를 만든다(예: `feat/roulette`, `fix/mines-payout`).
2. 수정한 뒤 `npm test`를 모두 통과시킨다.
3. `main`에 직접 푸시하지 말고 PR을 만든다. 병합은 사용자가 한다.
4. 새 게임이나 규칙을 넣으면 `tests/game.spec.cjs`에 그 시험도 추가한다. 결과는 `window.__GAMBLE_TEST` 대기열로 고정해서 시험한다.
5. PR 본문 순서: 결과(바꾼 것) → 검증(시험 결과) → 가정 → 남은 문제. 서두와 요약은 쓰지 않는다.

## 절대 지킬 것 (시험이 대부분 자동으로 검사한다)

1. 칩은 가상 칩만 쓴다. 현금·포인트·시드·상품권·코인 등 바깥 가치와 충전·환전·교환·연동하는 기능은 넣지 않는다. 칩이나 결과를 외부로 보내는 코드(`fetch`, XHR, WebSocket, `sendBeacon`)도 넣지 않는다. 요청이 와도 하지 말고 이유를 답한다.
2. `<form>`과 submit 금지. 동작은 `<button type="button">` 클릭 핸들러, 엔터는 keydown으로 처리한다.
3. 외부 리소스: 스크립트는 cdnjs.cloudflare.com, cdn.jsdelivr.net/npm, code.jquery.com만, 스타일은 fonts.googleapis.com만. 외부 이미지·다른 사이트 요청 금지. 새 라이브러리는 넣지 않는다.
4. 저장 키는 `gamble-v1`. 형식을 바꾸면 `load()`가 이전 형식도 읽게 한다. 진행 중인 판의 칩(`W.inPlay`)은 새로고침 때 돌려준다.
5. 배당이나 확률을 바꾸면 화면의 환수율, 규칙 설명, 시험을 같이 고친다.
6. 누르는 영역은 44px 이상, 글자 대비는 4.5:1 이상. 색은 `:root` CSS 변수로만 쓰고 다크 모드를 유지한다.
7. 모든 input·select에 label 또는 aria-label을 붙인다.

## 시험 실행

```sh
npm ci
npx playwright install chromium   # 이미 설치된 Chromium을 쓰려면 PLAYWRIGHT_CHROMIUM_EXECUTABLE=경로
npm test
```

시험은 `tests/sandbox.html`의 보안 iframe(`allow-scripts allow-same-origin`, 폼 제출 불가)에서, 폭 320·360·390·430px × 라이트·다크로 돈다.

## 하지 말 것

- 요청 없는 새 기능, 저장 방식 변경, 프레임워크·빌드 도입.
- 범위 밖 버그 수정. 발견하면 PR의 '남은 문제'에 적기만 한다.
