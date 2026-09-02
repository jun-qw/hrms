`server-only` 대체 모듈.

검증 스크립트는 Next 밖에서 돕니다. `src/lib/security/sensitive.ts` 는
서버 전용임을 못 박기 위해 `server-only` 를 import 하는데, 그 패키지는
Next 런타임에서만 해석됩니다. 스크립트에서 실행할 수 있도록 빈 모듈을
`NODE_PATH` 로 끼워 넣습니다. 제품 코드에는 영향이 없습니다.
