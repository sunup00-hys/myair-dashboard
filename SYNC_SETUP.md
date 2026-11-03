# myAir 개인용 자동 동기화

## 실제 배포 현황 (2026-11-03)
- Supabase personal project: `myair-health` (hys personal, separate from Diffusion AX)
- Database: `public.myair_records`, `public.myair_device_tokens`. RLS enabled and owner-only SELECT policy for records
- Edge Function: `myair-ingest` v3 ACTIVE, configured to validate private device token on every write
- Public dashboard: https://sunup00-hys.github.io/myair-dashboard/
- Pending: user signup/email confirmation, one-time device token enrollment, MacroDroid HTTP action, end-to-end testing.

## 개인 계정 만들기
1. GitHub Pages의 '클라우드 자동 동기화'에서 본인 이메일과 10자 이상 비밀번호 입력
2. '처음 사용: 개인 계정 만들기' 클릭. 메일 인증이 필요하면 메일을 확인 후 로그인
3. 로그인되면 'MacroDroid 전송 키 발급 / 재발급' 클릭
4. 64자리 전송키는 비공개이며 단 한 번 표시됩니다. 재발급 시 이전 키 즉시 무효화. GitHub나 스크린샷에 올리지 마세요.

## MacroDroid 전송 설정
- 기존 매크로: myAir 앱 실행 > 대시보드 > 화면 텍스트 전체 읽기 (변수 `myAirText`)
- 추가 동작: 웹 접속 / HTTP 요청 (앱 버전에 따라 명칭이 다를 수 있음)
- URL: `https://mwwzfrslmqhcgywnhrir.supabase.co/functions/v1/myair-ingest`
- Method: `POST`
- Request headers:
  - `Content-Type: application/json`
  - `X-MyAir-Device-Key: [웹앱 로그인 후 발급한 개인 비밀키]`
- Request body: JSON 타입, 전체 Dictionary의 MacroDroid Magic Text `{lvjson=myAirText}`
- 확인할 성공 응답: `{"ok":true,"date":"YYYY-MM-DD"}`
- 화면 잠금 상태에서는 자동 조작 실패할 수 있습니다. 초기에는 화면 잠금 해제 트리거로 테스트하세요.

## 데이터 안전
- GitHub에는 HTML/JS/SQL/Edge Function 코드 및 *공개 publishable key*만 저장합니다.
- 사용 기록은 Supabase RLS 테이블에 비공개로 저장하고, 서비스 키는 Edge Function 내부에서만 사용합니다.
- Secret device key는 브라우저 입력창에서만 1회 노출되며 전화기 매크로에만 저장합니다.
- 인터넷 연결과 myAir 데이터 갱신이 필요합니다. 잘못된 자료는 서버에서 거부합니다.
