# 프로젝트 구조

Next.js App Router 방식으로 구성된 프로젝트 구조입니다.

```
dopamine.land/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # 인증 API
│   │   │   ├── login/
│   │   │   │   └── route.ts      # POST /api/auth/login
│   │   │   └── register/
│   │   │       └── route.ts      # POST /api/auth/register
│   │   └── posts/                # 게시글 API
│   │       ├── [id]/
│   │       │   └── route.ts      # GET, DELETE /api/posts/[id]
│   │       └── route.ts          # GET, POST /api/posts
│   ├── board/                    # 게시판 페이지
│   │   ├── [id]/
│   │   │   └── page.tsx          # /board/[id] - 게시글 상세
│   │   └── page.tsx              # /board - 게시판 목록
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # / - 홈 페이지
├── components/                   # React 컴포넌트
│   ├── board/
│   │   ├── Board.tsx             # 게시판 목록 컴포넌트
│   │   └── BoardPostModal.tsx   # 게시글 작성 모달
│   ├── HeaderNavigator.tsx       # 헤더 네비게이션
│   └── LoginModal.tsx            # 로그인/회원가입 모달
├── lib/                          # 유틸리티 함수
│   ├── auth.ts                   # 인증 관련 함수 (JWT, 비밀번호 해시)
│   └── prisma.ts                 # Prisma Client 인스턴스
├── prisma/                       # Prisma 설정
│   └── schema.prisma             # 데이터베이스 스키마
├── public/                       # 정적 파일
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
├── middleware.ts                 # Next.js 미들웨어
├── next.config.js                # Next.js 설정
├── tsconfig.json                 # TypeScript 설정
├── package.json                  # 패키지 의존성
└── README.md                     # 프로젝트 문서
```

## 주요 변경사항

### 삭제된 파일/폴더
- `src/` - React 앱의 소스 폴더 (Next.js는 `app/` 사용)
- `build/` - React 빌드 폴더 (Next.js는 `.next/` 사용)
- `public/index.html` - React용 HTML 템플릿 (Next.js는 자동 생성)
- `yarn.lock`, `yarn-error.log` - Yarn 관련 파일

### Next.js App Router 구조
- **app/** - 페이지와 API 라우트를 포함하는 App Router 디렉토리
- **components/** - 재사용 가능한 React 컴포넌트
- **lib/** - 공유 유틸리티 함수
- **prisma/** - 데이터베이스 스키마 및 마이그레이션

### 라우팅
- `/` - 홈 페이지 (`app/page.tsx`)
- `/board` - 게시판 목록 (`app/board/page.tsx`)
- `/board/[id]` - 게시글 상세 (`app/board/[id]/page.tsx`)
- `/api/auth/login` - 로그인 API
- `/api/auth/register` - 회원가입 API
- `/api/posts` - 게시글 목록/작성 API
- `/api/posts/[id]` - 게시글 상세/삭제 API

