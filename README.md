# 가계부 관리 프로그램

기존 엑셀로 관리하던 가계부를 대체하는 개인용 가계부 웹앱입니다. 월별 수입/고정지출/저축투자/변동지출을 카테고리별로 기록하고, 자동 합계·예산 대비 지출 비교·연간 요약 대시보드를 제공합니다.

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버 실행 (http://localhost:5173)
npm run build    # 정적 파일 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
```

## 기능

- **대시보드**: 이번 달 수입/지출/저축/순잔액 요약 카드 + 12개월 추이 라인 차트
- **월별 입력**: 연/월 선택 후 카테고리별로 여러 건의 수입/지출 항목(항목명+금액+메모)을 추가·수정·삭제
- **예산 비교**: 카테고리 × 12개월 예산 입력 그리드, 선택한 월의 예산 대비 실제 지출·차이·달성률(초과 시 빨간색 강조), 연간 섹션별 예산 대비 실적
- **연간 리포트**: 카테고리별 연간 지출 비중(막대·파이 차트), 월별 요약 테이블, 연간 합계·월평균
- **신용카드 트래커**: 카테고리 합계와는 별개로 관리되는 신용카드 누적 사용 기록
- **검색**: 항목명·메모·카테고리·연도로 지난 내역 검색
- **가구 공유**: 초대 코드로 배우자/가족과 하나의 가계부를 함께 기록
- **예산/고정지출 알림**: 대시보드에 예산 초과·임박 카테고리와 3일 이내 결제 예정인 고정지출을 배너로 표시하고, 원하면 브라우저 알림으로도 받기
- **저축 목표**: 저축/투자 카테고리에 목표 금액(과 선택적으로 목표일)을 걸어두면 진행률 바로 확인
- **CSV 가져오기**: 엑셀에서 정리해 둔 과거 내역을 CSV로 저장해 업로드하면 가계부 항목으로 일괄 등록 (연간 리포트 페이지). 형식이 맞지 않는 행은 가져오지 않고 오류 내용을 보여줌

## 데이터 저장 & 로그인

이메일/비밀번호로 로그인하면 [Supabase](https://supabase.com)(Postgres)에 데이터가 저장되어 PC·폰 등 어느 기기에서 로그인하든 같은 데이터를 봅니다. 각 사용자는 Row Level Security로 자신의 데이터만 읽고 쓸 수 있습니다.

### Supabase 설정 (최초 1회)

1. [supabase.com](https://supabase.com)에서 무료 프로젝트를 생성합니다.
2. 프로젝트의 **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체 내용을 실행합니다 (entries/budgets/card_entries 테이블 + RLS 정책 생성).
3. **Settings → API**에서 `Project URL`과 `anon public` 키를 복사합니다.
4. 로컬 개발용: `budget-app/.env` 파일을 만들고 [`.env.example`](./.env.example)을 참고해 값을 채웁니다.
5. 배포용(GitHub Pages): 저장소 **Settings → Secrets and variables → Actions**에서 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 두 개의 Repository secret을 추가합니다. `deploy-budget-app.yml` 워크플로우가 빌드 시 이 값을 주입합니다.

기본적으로 Supabase는 회원가입 시 이메일 인증을 요구합니다. 개인적으로만 쓰면서 인증 메일이 번거롭다면 Supabase 프로젝트의 **Authentication → Providers → Email**에서 "Confirm email"을 꺼도 됩니다.

Supabase 환경 변수가 설정되지 않은 상태로 실행하면 로그인 화면 대신 설정 안내 메시지가 표시됩니다.

### 가구(household) 공유

기존에 Supabase 프로젝트를 만들어 쓰고 있었다면, **가구 공유**와 **저축 목표** 기능을 쓰기 위해 [`supabase/schema.sql`](./supabase/schema.sql)을 SQL Editor에서 한 번 더 실행해야 합니다 (households/household_members/household_invites/savings_goals 테이블과 RLS 정책이 추가되며, 기존 사용자에게는 자동으로 개인 가구가 배정됩니다). 저축 목표는 가구 단위로 공유됩니다.

사이드바의 **가구 공유** 메뉴에서 초대 코드를 만들어 배우자/가족에게 전달하면, 상대방이 자신의 계정으로 로그인한 뒤 그 코드를 입력해 참여할 수 있습니다. 참여하는 순간 두 사람이 각자 입력했던 내역이 하나의 가계부로 합쳐지고, 이후 예산은 가구당 하나만 유지됩니다. 이메일 발송 없이 코드만으로 동작하며, 계정을 새로 만들 필요 없이 기존 로그인을 그대로 씁니다.

## 기술 스택

React + TypeScript + Vite, Tailwind CSS, Recharts, Zustand, React Router, Supabase (Postgres + Auth).
