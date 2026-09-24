# 아이템 다이어리 — Supabase API 정리

> Supabase JS 클라이언트(`@supabase/supabase-js`)를 사용하며, 모든 호출은 `src/lib/supabase.js`의 `supabase` 인스턴스를 통해 이루어집니다.

---

## 클라이언트 설정

**파일**: `src/lib/supabase.js`

```js
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- URL / Anon Key: `.env` → `react-native-config`으로 주입
- 세션: AsyncStorage에 자동 저장/복원

---

## Auth API

### 회원가입
```js
supabase.auth.signUp({ email, password })
```
- **파일**: `signUpScreen.js`
- **동작**: 가입 후 이메일 인증 메일 자동 발송. session이 null이면 인증 대기 상태.
- **응답**: `{ data: { session, user }, error }`

---

### 로그인
```js
supabase.auth.signInWithPassword({ email, password })
```
- **파일**: `signUpScreen.js`, `UserQuitScreen.js` (탈퇴 전 재확인)
- **응답**: `{ data: { session, user }, error }`
- 실패 시 error.message 반환 (틀린 비밀번호 등)

---

### 로그아웃
```js
supabase.auth.signOut()
```
- **파일**: `ProfileScreen.js`, `ResetPasswordScreen.js`, `UserQuitScreen.js`
- **동작**: 세션 삭제 → `onAuthStateChange`에서 SIGNED_OUT 이벤트 발생 → 로그인 화면으로 이동

---

### 현재 사용자 조회
```js
const { data: { user } } = await supabase.auth.getUser()
```
- **파일**: `ItemFormScreen.js`, `ProfileScreen.js`, `UserQuitScreen.js`, `ShareModalScreen.js`
- **용도**: `user.email`을 `user_id`로 사용 (items 테이블 RLS 기준)

---

### 세션 조회
```js
const { data: { session } } = await supabase.auth.getSession()
```
- **파일**: `RootNavigator.js` (앱 시작 시), `useImagePicker.js` (업로드 토큰용)
- **용도**: 앱 초기 로그인 상태 복원 / Storage 업로드 시 Bearer 토큰 획득

---

### 세션 변경 구독
```js
supabase.auth.onAuthStateChange((event, session) => { ... })
```
- **파일**: `RootNavigator.js`
- **이벤트**: `SIGNED_IN`, `SIGNED_OUT`, `PASSWORD_RECOVERY` 등
- **용도**: 로그인/로그아웃 시 화면 전환, `SIGNED_OUT` 시 `needsPasswordReset` 플래그 초기화

---

### 딥링크 세션 복원 (비밀번호 재설정)
```js
supabase.auth.setSession({ access_token, refresh_token })
```
- **파일**: `RootNavigator.js`
- **동작**: 이메일 링크 클릭 → `itemdiary://reset-password#access_token=...&type=recovery` 딥링크 수신 → 토큰 파싱 → setSession 호출
- **주의**: `setNeedsPasswordReset(true)`를 반드시 setSession **이전에** 호출해야 Main 화면으로 튀는 것을 막을 수 있음

---

### 비밀번호 재설정 이메일 발송
```js
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'itemdiary://reset-password',
})
```
- **파일**: `ForgotPasswordScreen.js`
- **동작**: 입력한 이메일로 재설정 링크 발송. 이메일이 DB에 없어도 에러 반환 안 함 (보안 설계).

---

### 비밀번호 변경
```js
supabase.auth.updateUser({ password: newPassword })
```
- **파일**: `ResetPasswordScreen.js`
- **선행 조건**: setSession으로 recovery 세션이 활성화된 상태여야 함
- **완료 후**: `supabase.auth.signOut()` 호출 → 새 비밀번호로 재로그인 유도

---

## Database API — items 테이블

### 아이템 목록 조회 (페이지네이션)
```js
supabase
  .from('items')
  .select('*')
  .eq('is_wishlist', isWishlist)          // 아이템/찜 구분
  .eq('category_id', categoryId)          // [선택] 카테고리 필터
  .ilike('name', `%${search}%`)           // [선택] 이름 검색
  .order(sortBy, { ascending: sortAsc })  // 정렬
  .range(from, to)                        // 페이지네이션 (PAGE_SIZE=20)
```
- **파일**: `useItems.js` (fetchItems, fetchMore)
- **정렬 옵션**: `created_at` / `item_date` / `price` / `name`
- **RLS**: user_id 기준 본인 데이터만 반환

---

### 캘린더 월별 점 표시 + 월 합계
```js
supabase
  .from('items')
  .select('item_date, price')
  .eq('is_wishlist', false)
  .gte('item_date', firstDay)   // YYYY-MM-01
  .lte('item_date', lastDay)    // YYYY-MM-말일
```
- **파일**: `useCalendarItems.js` (fetchMonthDots)
- **응답**: item_date별 dot 마킹 + price 합산 → 월 총지출

---

### 캘린더 특정 날짜 아이템 조회
```js
supabase
  .from('items')
  .select('*')
  .eq('is_wishlist', false)
  .eq('item_date', dateString)  // YYYY-MM-DD
  .order('created_at', { ascending: false })
```
- **파일**: `useCalendarItems.js` (fetchDayItems)

---

### 통계 조회
```js
supabase
  .from('items')
  .select('price, item_date')
  .eq('user_id', user.email)
```
- **파일**: `ProfileScreen.js`
- **클라이언트 집계**: 총 아이템수 / 총지출 / 이번달 지출

---

### 아이템 등록
```js
supabase.from('items').insert({
  name, price, item_date, store_name, link, memo,
  category_id, image_url, is_wishlist,
  user_id: user.email,
})
```
- **파일**: `ItemFormScreen.js`, `ShareModalScreen.js`
- `ShareModalScreen`은 항상 `is_wishlist: true`로 등록

---

### 아이템 수정
```js
supabase
  .from('items')
  .update({ name, price, item_date, store_name, link, memo,
            category_id, image_url, is_wishlist,
            updated_at: new Date().toISOString() })
  .eq('seq', item.seq)
```
- **파일**: `ItemFormScreen.js`

---

### 찜 → 구입 완료 전환
```js
supabase
  .from('items')
  .update({
    is_wishlist: false,
    item_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  })
  .eq('seq', item.seq)
```
- **파일**: `DetailScreen.js`

---

### 아이템 단건 삭제
```js
supabase.from('items').delete().eq('seq', item.seq)
```
- **파일**: `DetailScreen.js`

---

### 아이템 전체 삭제 (회원탈퇴)
```js
supabase.from('items').delete().eq('user_id', user.email)
```
- **파일**: `UserQuitScreen.js`
- **순서**: 아이템 전체 삭제 → RPC delete_user() → signOut

---

## Database API — categories 테이블

### 카테고리 목록 조회
```js
supabase
  .from('categories')
  .select('*')
  .order('sort_order', { ascending: true })
```
- **파일**: `useCategories.js`
- **캐싱**: 모듈 변수 `cachedCategories`에 저장 → 앱 실행 중 1회만 호출
- **폴백**: 조회 실패 시 하드코딩된 DEFAULT_CATEGORIES 사용

---

## Storage API — item-images 버킷

### 이미지 업로드
```
POST {SUPABASE_URL}/storage/v1/object/item-images/{user.email}/{timestamp}.{ext}
Headers:
  Authorization: Bearer {session.access_token}
  apikey: {SUPABASE_ANON_KEY}
Body: FormData (file)
```
- **파일**: `useImagePicker.js`
- **경로 규칙**: `{이메일}/{타임스탬프}.{확장자}`
- **방식**: Supabase JS SDK가 아닌 `fetch()` 직접 호출 (React Native FormData 호환성 이슈)

---

### 이미지 공개 URL 획득
```js
supabase.storage.from('item-images').getPublicUrl(fileName)
// 반환: { data: { publicUrl: 'https://...' } }
```
- **파일**: `useImagePicker.js`
- **버킷 설정**: Public 버킷이므로 인증 없이 URL로 직접 접근 가능

---

## RPC

### 회원 탈퇴 (계정 삭제)
```js
supabase.rpc('delete_user')
```
- **파일**: `UserQuitScreen.js`
- **서버 함수**:
  ```sql
  CREATE OR REPLACE FUNCTION delete_user()
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    DELETE FROM auth.users WHERE id = auth.uid();
  END;
  $$;
  ```
- **SECURITY DEFINER**: 클라이언트가 직접 auth.users를 삭제할 수 없으므로 서버 권한으로 실행
- **호출 순서**: items 전체 삭제 → `delete_user()` → `signOut()`

---

## RLS 정책 요약

| 테이블 | 정책 | 조건 |
|---|---|---|
| items | 본인 데이터만 접근 | `user_id = (SELECT email FROM auth.users WHERE id = auth.uid())` |
| categories | 로그인 사용자 읽기 | `TO authenticated` |
| item-images | Public | 인증 없이 읽기 가능, 업로드는 Bearer 토큰 필요 |
