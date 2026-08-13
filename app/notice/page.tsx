'use client'

import HeaderNavigator from '@/components/HeaderNavigator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar } from 'lucide-react'

// 더미 데이터
const notices = [
    { id: 1, title: '오픈 베타 서비스 시작 안내', content: '안녕하세요, 관리자입니다. 드디어 오픈 베타 서비스를 시작합니다! 많은 이용 부탁드립니다.', date: '2023-10-25', type: 'notice' },
    { id: 2, title: '[점검] 서버 안정화 작업 안내', content: '서버 안정화를 위해 10월 27일 새벽 2시부터 4시까지 점검이 진행될 예정입니다.', date: '2023-10-26', type: 'maintenance' },
    { id: 3, title: '신규 게임 "이치방쿠지" 업데이트', content: '새로운 뽑기 게임 이치방쿠지가 추가되었습니다. 지금 바로 도전해보세요!', date: '2023-10-30', type: 'update' },
]

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0c] to-black text-slate-100 overflow-x-hidden">
      <HeaderNavigator />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Bell className="w-8 h-8 text-yellow-400" />
                공지사항
            </h1>

            <div className="space-y-4">
                {notices.map((notice) => (
                    <Card key={notice.id} className="bg-[#131316] border-white/10 text-white hover:border-white/20 transition-colors">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`
                                            ${notice.type === 'notice' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : ''}
                                            ${notice.type === 'maintenance' ? 'text-red-400 border-red-400/30 bg-red-400/10' : ''}
                                            ${notice.type === 'update' ? 'text-green-400 border-green-400/30 bg-green-400/10' : ''}
                                        `}>
                                            {notice.type.toUpperCase()}
                                        </Badge>
                                        <CardTitle className="text-lg">{notice.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                                        <Calendar className="w-3 h-3" />
                                        {notice.date}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                {notice.content}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </main>
    </div>
  )
}

