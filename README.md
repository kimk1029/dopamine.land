# Dopamine Ground

Dopamine Ground - Your Ultimate Gaming Platform

## 기능

- 회원가입 및 로그인
- 게시글 작성, 조회, 삭제
- JWT 기반 인증
- PostgreSQL 데이터베이스 연동

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **데이터베이스**: PostgreSQL
- **ORM**: Prisma
- **스타일링**: Styled Components
- **인증**: JWT (jsonwebtoken, bcryptjs)

## 시작하기

### 1. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 2. 환경 변수 설정

**중요**: 프로젝트를 처음 클론받은 경우, `.env` 파일이 없어서 데이터베이스 연결 오류가 발생합니다.

`.env.example` 파일을 복사하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

그 다음 `.env` 파일을 열어서 실제 데이터베이스 정보로 수정하세요:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/test_board_db?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
```

**또는** 자동 설정 스크립트를 사용할 수 있습니다 (Linux/macOS):

```bash
./setup-db-manual.sh
```

자세한 데이터베이스 설정 방법은 [DATABASE_SETUP.md](./DATABASE_SETUP.md)를 참고하세요.

### 3. 데이터베이스 설정

PostgreSQL 데이터베이스를 생성하고 Prisma를 사용해 스키마를 적용합니다:

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push

# 또는 마이그레이션 사용
npm run db:migrate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run db:generate` - Prisma Client 생성
- `npm run db:push` - 데이터베이스 스키마 적용
- `npm run db:migrate` - 마이그레이션 실행
- `npm run db:studio` - Prisma Studio 실행

## 프로젝트 구조

```
dopamine.land/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # 인증 API
│   │   └── posts/        # 게시글 API
│   ├── board/            # 게시판 페이지
│   └── page.tsx          # 홈 페이지
├── components/            # React 컴포넌트
│   ├── board/           # 게시판 관련 컴포넌트
│   ├── HeaderNavigator.tsx
│   └── LoginModal.tsx
├── lib/                  # 유틸리티 함수
│   ├── auth.ts          # 인증 관련 함수
│   └── prisma.ts        # Prisma Client
├── prisma/              # Prisma 설정
│   └── schema.prisma    # 데이터베이스 스키마
└── public/              # 정적 파일
```

## API 엔드포인트

### 인증

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 게시글

- `GET /api/posts` - 게시글 목록 조회
- `POST /api/posts` - 게시글 작성 (인증 필요)
- `GET /api/posts/[id]` - 게시글 상세 조회
- `DELETE /api/posts/[id]` - 게시글 삭제 (인증 필요, 작성자만)

## 데이터베이스 스키마

### User
- `id` (Int, Primary Key)
- `email` (String, Unique)
- `password` (String, Hashed)
- `nickname` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Post
- `id` (Int, Primary Key)
- `title` (String)
- `content` (Text)
- `authorId` (Int, Foreign Key -> User.id)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

## 주의사항

- 프로덕션 환경에서는 반드시 `JWT_SECRET`을 안전한 값으로 변경하세요.
- 데이터베이스 비밀번호는 환경 변수로 관리하세요.
- `.env` 파일은 `.gitignore`에 포함되어 있어야 합니다.
