# itemdiary (아이템 다이어리)

구입한 물건들의 날짜, 가격, 구입처 등의 정보를 기록하는 모바일 앱

---

## 프로젝트 소개

쇼핑 기록을 간편하게 관리할 수 있는 Android 앱입니다.
옷, 가구, 가전, 가방, 신발 등 구입한 아이템을 나중에 "언제 샀더라?" 하고 잊어버릴 때 빠르게 확인할 수 있도록, 구매 날짜·가격·구입처·이미지를 간편하게 기록하고 조회할 수 있습니다.

- **Google Play Store** 배포 중
- 패키지명: `com.openended.keep_product`

---

## 개발 기간

| 구분 | 일정 |
|---|---|
| 최초 개발 | 2022.09 ~ 2022.11 |
| 최초 Android 배포 | 2022.11 |
| 백엔드 Supabase 전환 | 2026.04 |
| UI/UX 리뉴얼 계획 수립 | 2026.04 |
| 최종 빌드 (versionCode 10) | 2026.04 |

---

## 기술 스택

### Frontend
- React Native 0.68.0
- React Navigation (Bottom Tabs, Stack)
- react-native-image-picker
- react-native-fast-image
- react-native-splash-screen
- react-native-vector-icons

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
  - 기존: Spring Boot + MySQL → 2026년 4월 Supabase로 전환
  - 인증: Supabase Auth (이메일/비밀번호)
  - 이미지 저장: Supabase Storage (`item-images` 버킷)

### 빌드 / 배포
- Android Gradle Plugin 7.3.1
- targetSdkVersion 35
- Google Play App Signing 적용

---

## 주요 기능

- 아이템 목록 조회 (그리드 / 리스트 뷰)
- 아이템 등록 (이름, 날짜, 가격, 카테고리, 구입처, 링크, 메모, 이미지)
- 아이템 수정 / 삭제
- 이미지 업로드 및 표시
- 카테고리·날짜·가격 필터 및 검색
- 회원가입 / 로그인 / 로그아웃
- 회원 탈퇴 (본인 데이터 전체 삭제)
- 데모 로그인 (체험용)
- 앱 버전 조회

---

## UI/UX 리뉴얼 계획

### 배경

기존 앱의 주요 문제점:
- `listTab.js`: 페이지네이션 없이 전체 데이터 fetch, 검색/필터 없음
- `detailScreen.js`: `editable={false}` TextInput 사용 → 비활성화된 폼처럼 보여 UX 최악
- `writeTab.js` / `modifyScreen.js`: 거의 동일한 코드 대규모 중복
- 글쓰기가 탭 안에 있어 돌아와도 상태가 유지되는 UX 문제
- `navigation.push("Main")` — 저장 후 화면을 스택에 계속 쌓는 버그

---

### 디자인 시스템

#### 컬러 팔레트

| 역할 | 색상 | 비고 |
|---|---|---|
| Primary | `#3B82F6` | 액션 버튼, FAB |
| Primary Dark | `#1D4ED8` | Pressed 상태 |
| Surface | `#FFFFFF` | 카드 배경 |
| Background | `#F8F9FA` | 화면 배경 (오프화이트) |
| Border | `#E5E7EB` | 구분선 |
| Text Primary | `#111827` | 본문 |
| Text Secondary | `#6B7280` | 날짜, 레이블 |
| Text Muted | `#9CA3AF` | Placeholder |
| Danger | `#EF4444` | 삭제 |
| Success | `#10B981` | 저장 완료 |

카테고리 칩 색상:

| 카테고리 | 색상 |
|---|---|
| 의류 | `#8B5CF6` (보라) |
| 신발 | `#EC4899` (핑크) |
| 가방 | `#F59E0B` (앰버) |
| 가전 | `#3B82F6` (파랑) |
| 가구 | `#10B981` (에메랄드) |
| 잡화 | `#6B7280` (회색) |
| 기타 | `#9CA3AF` (연회색) |

#### 타이포그래피

| 토큰 | fontSize | fontWeight | 용도 |
|---|---|---|---|
| h1 | 24 | 700 | 화면 제목 |
| h2 | 20 | 700 | 섹션 헤더 |
| h3 | 18 | 600 | 리스트 아이템 제목 |
| body | 16 | 400 | 표준 본문 |
| bodyBold | 16 | 600 | 강조 본문 |
| caption | 14 | 400 | 메타데이터 |
| small | 12 | 400 | 타임스탬프, 보조 레이블 |
| price | 16 | 700 | 가격 표시 |

#### 스페이싱 (8px 그리드)

```javascript
spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
radius:  { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 }
```

---

### 공통 UI 컴포넌트 (`src/components/ui/`)

| 컴포넌트 | 설명 |
|---|---|
| `Button.js` | primary / secondary / outline / danger, sm/md 사이즈 |
| `Card.js` | 카드 컨테이너, onPress 여부에 따라 Pressable/View |
| `Badge.js` | 카테고리 뱃지, 커스텀 색상 지원 |
| `Input.js` | 라벨 + 에러 표시 포함, multiline 지원 |
| `LoadingOverlay.js` | 반투명 로딩 오버레이 |
| `EmptyState.js` | 빈 상태 (아이콘 + 제목 + 부제목) |
| `CategoryChips.js` | 가로 스크롤 카테고리 칩 |
| `ItemCard.js` | 그리드 / 리스트 모드 겸용 아이템 카드 |

---

### 네비게이션 재구성

```
RootStack (Stack Navigator)
├── SignUpScreen
└── App (로그인 후)
    ├── MainTabs (Bottom Tab Navigator)
    │   ├── 홈   → ListScreen
    │   ├── 검색  → SearchScreen
    │   └── 더보기 → ProfileScreen
    └── Modal Stack
        ├── ItemFormScreen  (Write + Modify 통합)
        ├── DetailScreen
        └── UserQuitScreen
```

> **글쓰기를 모달로 분리한 이유:** FAB(우하단 + 버튼)으로 진입, 저장 후 dismiss → 리스트 새로고침.
> 탭에 있을 경우 항상 마운트 상태라 폼 상태가 초기화되지 않는 UX 문제를 해결.

---

### 화면별 설계

#### ListScreen (홈)

- **그리드 / 리스트 토글** (헤더 우상단, 선택값 AsyncStorage 저장)
- **정렬:** 최신순 | 날짜순 | 가격순 | 이름순
- **무한 스크롤:** `.range(0, 19)` 시작, `onEndReached`로 추가 로드
- **FAB:** 파란 원형 + 버튼 → ItemFormScreen 모달 오픈

그리드 카드 구조:
```
┌──────────────┐
│   [이미지]    │  ← 상단 60%
├──────────────┤
│ 아이템 제목   │  ← 최대 2줄
│ 2024.03.15   │
│ 150,000원    │
│ [의류]        │
└──────────────┘
```

#### SearchScreen (신규)

- 이름 검색 (`ilike`)
- 카테고리 / 날짜 범위 / 가격 범위 필터
- 결과 건수 표시 + 페이지네이션

#### ItemFormScreen (Write + Modify 통합)

- `route.params?.item` 유무로 등록/수정 모드 분기
- **섹션 1 (필수):** 사진, 제품명, 날짜, 가격
- **섹션 2 (선택, 기본 접힘):** 카테고리, 구입처, 링크, 메모

> 핵심 사용 사례는 빠른 등록. 선택 필드를 기본 접어 폼 마찰 최소화.

#### DetailScreen

- `editable={false}` TextInput → `<Text>` 전환
- 이미지 탭으로 확대
- 링크 → `Linking.openURL` 연결
- 공유하기 / 삭제하기 버튼

#### ProfileScreen

- 사용자 이메일 / 이니셜 아바타
- 내 통계: 전체 아이템 수, 총 지출액, 이번 달 등록 수
- 데이터 내보내기 (CSV)
- 로그아웃 / 회원 탈퇴
- 앱 버전 확인

---

### 리뉴얼 Phase 구분

**Phase 1 — 핵심 리뉴얼 (Must-Have)**
- 2열 그리드 뷰
- 카테고리 칩
- DetailScreen 개선 (disabled TextInput 제거)
- FAB + 모달 글쓰기
- 검색 탭
- 정렬 옵션
- navigation.push 버그 수정
- Write + Modify 통합
- 페이지네이션
- 구입처 필드 추가

**Phase 2 — Nice-to-Have**
- 공유 카드 (react-native-view-shot + share)
- 통계 화면
- 즐겨찾기
- CSV 내보내기
- 이미지 압축 업로드

**Phase 3 — 장기 검토**
- 바코드 스캔
- 아이템당 다중 이미지
- 다크 모드
- 푸시 알림

---

### 리뉴얼 구현 파일 목록 (Phase 1)

| 경로 | 설명 |
|---|---|
| `src/constants/colors.js` | 컬러 팔레트 |
| `src/constants/typography.js` | 타이포그래피 스케일 |
| `src/constants/spacing.js` | 스페이싱 / 반경 |
| `src/components/ui/Button.js` | 공통 버튼 |
| `src/components/ui/Card.js` | 공통 카드 |
| `src/components/ui/Badge.js` | 카테고리 뱃지 |
| `src/components/ui/Input.js` | 공통 인풋 |
| `src/components/ui/LoadingOverlay.js` | 로딩 오버레이 |
| `src/components/ui/EmptyState.js` | 빈 상태 |
| `src/components/ui/CategoryChips.js` | 카테고리 칩 |
| `src/components/ui/ItemCard.js` | 아이템 카드 |
| `src/hooks/useImagePicker.js` | 이미지 선택 훅 |
| `src/hooks/useCategories.js` | 카테고리 조회 훅 |
| `src/hooks/useItems.js` | 아이템 목록 훅 |
| `src/utils/formatPrice.js` | 가격 포맷 |
| `src/utils/formatDate.js` | 날짜 포맷 |
| `src/navigation/RootNavigator.js` | 루트 네비게이터 |
| `src/navigation/TabNavigator.js` | 하단 탭 네비게이터 |
| `src/screens/ListScreen.js` | 홈 화면 |
| `src/screens/ItemFormScreen.js` | 등록/수정 통합 |
| `src/screens/DetailScreen.js` | 상세 화면 |
| `src/screens/SearchScreen.js` | 검색 화면 |
| `src/screens/ProfileScreen.js` | 설정/프로필 |
| `src/screens/UserQuitScreen.js` | 회원 탈퇴 |
| `supabase_migration.sql` | DB 마이그레이션 SQL |

---

## DB 스키마 (Supabase)

```sql
CREATE TABLE items (
  seq        BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT,
  price      INTEGER,
  item_date  DATE,
  memo       TEXT,
  link       TEXT,
  image_url  TEXT,
  store_name TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 데이터만 접근"
  ON items FOR ALL
  USING (user_id = auth.jwt() ->> 'email');

CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  icon       TEXT,
  sort_order INTEGER DEFAULT 0
);
```

Storage 버킷: `item-images` (Public)

---

## 릴리즈 빌드

```bash
cd android
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home \
UPLOAD_STORE_PASSWORD='...' \
UPLOAD_KEY_PASSWORD='...' \
./gradlew bundleRelease
```

결과물: `android/app/build/outputs/bundle/release/app-release.aab`

> **참고:** 시스템 Java가 17보다 높은 경우 `JAVA_HOME`으로 Java 17을 명시해야 합니다.
> `gradle.properties`에 `android.aapt2FromMavenOverride` 설정으로 build-tools 35의 aapt2를 사용합니다.

---

## 버전 이력

| versionCode | versionName | 내용 |
|---|---|---|
| 7 | 1.0.x | 기존 Spring Boot 백엔드 버전 |
| 8 | 1.1.0 | Supabase 전환, Firebase 제거 |
| 9 | 1.1.0 | 데모 로그인 버튼, 앱 아이콘 복원 |
| 10 | 1.1.0 | targetSdkVersion 35 대응 |

---

## screen shot

![Screenshot_20240205_140606_Google Play Store](https://github.com/couqued/itemdiary/assets/133190204/d72e8435-277d-48bd-9e7e-4f9ee8864d8e)
![Screenshot_20240205_140611_Google Play Store](https://github.com/couqued/itemdiary/assets/133190204/2a6c88d8-53ee-48e1-abca-4f792ba6a834)
![Screenshot_20240205_140624_Google Play Store](https://github.com/couqued/itemdiary/assets/133190204/00819795-2d90-4f16-a8d5-7083cc58449f)
![Screenshot_20240205_140627_Google Play Store](https://github.com/couqued/itemdiary/assets/133190204/f3e8e7a2-66b0-408b-bcdc-21303cc9874e)
![Screenshot_20240205_140003_ ](https://github.com/couqued/itemdiary/assets/133190204/95e0c3f7-5eed-4e1c-8681-ccade2ef633e)
