'use client';

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, Flag, Trophy, BookOpen, Plus } from "lucide-react";

type Template = {
  id: string;
  title: string;
  icon: ReactNode;
  isBlank?: boolean;
}

const TEMPLATE: Template[] = [
  {
    id: 'univ-team',
    title: '대학 팀 프로젝트',
    icon: <Flag size={18}/>
  },
  {
    id: 'contest',
    title: '공모전 / 대회',
    icon: <Trophy size={18}/>
  },
  {
    id: 'research',
    title: '연구 / 논문 프로젝트',
    icon: <BookOpen size={18}/>
  },
  {
    id: 'empty',
    title: '빈 프로젝트',
    icon: <Plus size={32}/>,
    isBlank: true
  }
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState('');
  
  function handleBack() {
    router.back();
  }

  function handleSelect() {
    if (!selectedId) {
      alert('템플릿을 선택해 주세요.');
      return;
    }

    //router.push('다음 페이지');
  }

  function getFilteredTemplate() {
    return TEMPLATE.filter(function (template) {
      return template.title.includes(searchTerm);
      });
  }

  const filteredTemplate = getFilteredTemplate();
  

  return (
    <div style={{ backgroundColor: '#FBFBFC', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        
        {/* 상단 제목 */}
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#000000' }}> 사용할 템플릿</h1>

        {/* 흰색 카드 영역 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDDCDC',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* 검색창 */}
            <div style={{ position: 'relative', width: '360px' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888888'
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="템플릿 검색(예: 팀플, 공모전)"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 42px',
                  borderRadius: '8px',
                  border: '1px solid #DDDCDC',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#000000',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            {/* 템플릿 2열 배치 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px'
              }}
            >
              {filteredTemplate.map((item) => {
                const isSelected = selectedId === item.id;

                if (item.isBlank) {
                  // 빈 프로젝트 카드
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      style={{
                        height: '260px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2058EC' : '1px solid #DDDCDC',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxSizing: 'border-box',
                        transition: 'border 0.2s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: '1px solid #DDDCDC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666666'
                        }}
                      >
                        {item.icon}
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000' }}>
                        {item.title}
                      </span>
                    </div>
                  );
                }

                // 일반 템플릿 카드
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      height: '260px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2058EC' : '1px solid #DDDCDC',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      transition: 'border 0.2s ease'
                    }}
                  >
                    {/* 예시 이미지 영역 */}
                    <div
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}
                    >
                      예시 이미지
                    </div>

                    {/* 하단 타이틀 영역 */}
                    <div
                      style={{
                        padding: '16px 20px',
                        borderTop: '1px solid #DDDCDC',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <span style={{ color: '#000000', display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000' }}>
                        {item.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* 하단 버튼 영역 */}
          <div
            style={{
              padding: '24px 40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF'
            }}
          >
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '12px 36px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DDDCDC',
                borderRadius: '8px',
                color: '#000000',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            > 이전</button>

            <button
              type="button"
              onClick={handleSelect}
              style={{
                padding: '12px 36px',
                backgroundColor: '#2058EC',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            > 선택</button>
          </div>

        </div>

      </div>
    </div>
  );
}