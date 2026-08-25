'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProJectPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleCancel() {
    if (confirm('작성을 취소하시겠습니까?')) {
      router.push('/mainpage');
    }
  };

  function handleNext(e: React.SyntheticEvent) {
    e.preventDefault();

    if (!projectName.trim()) {
      alert('프로젝트 이름을 입력해주세요.');
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      alert('종료일은 시작일 이후여야 합니다.');
      return;
    }

    const projectdata = new URLSearchParams({
      projectName,
      description,
      startDate,
      endDate
    }).toString();

    router.push(`/newtemplatepage?${projectdata}`);
  };


  return (
    <div style={{ backgroundColor: '#FBFBFC', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        {/* 상단 제목 */}
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#000000' }}> 새 프로젝트 만들기</h1>

        {/* 흰색 카드 영역 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DDDCDC',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <form onSubmit={handleNext}>
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
              
              {/* 프로젝트 이름 */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '200px', fontSize: '18px', fontWeight: 'bold', color: '#000000' }}> 프로젝트 이름</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={function (e) { setProjectName(e.target.value); }}
                  placeholder="프로젝트 이름을 입력해주세요."
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #DDDCDC',
                    outline: 'none',
                    fontSize: '15px',
                    color: '#000000'
                  }}
                />
              </div>

              {/* 프로젝트 설명 */}
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <label
                  style={{
                    width: '200px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#000000',
                    paddingTop: '10px'
                  }}
                > 프로젝트 설명</label>
                <textarea
                  value={description}
                  onChange={function (e) { setDescription(e.target.value); }}
                  placeholder="프로젝트 설명을 입력해주세요."
                  rows={5}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #DDDCDC',
                    outline: 'none',
                    fontSize: '15px',
                    color: '#000000',
                    resize: 'none'
                  }}
                />
              </div>

              {/* 프로젝트 기간 */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '200px', fontSize: '18px', fontWeight: 'bold', color: '#000000' }}> 프로젝트 기간</label>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  
                  {/* 시작일 */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    {!startDate && (
                      <span
                        style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '15px',
                          color: '#888888',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      > 시작일</span>
                    )}
                    <input
                      type="date"
                      value={startDate}
                      onChange={function (e) { setStartDate(e.target.value); }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #DDDCDC',
                        outline: 'none',
                        fontSize: '15px',
                        color: startDate ? '#000000' : 'transparent',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#000000' }}>~</span>

                  {/* 종료일 */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    {!endDate && (
                      <span
                        style={{
                          position: 'absolute',
                          left: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '15px',
                          color: '#888888',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      > 종료일</span>
                    )}
                    <input
                      type="date"
                      value={endDate}
                      onChange={function (e) { setEndDate(e.target.value); }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #DDDCDC',
                        outline: 'none',
                        fontSize: '15px',
                        color: endDate ? '#000000' : 'transparent',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* 하단 버튼 영역 */}
            <div
              style={{
                borderTop: '1px solid #DDDCDC',
                padding: '24px 40px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                backgroundColor: '#FFFFFF'
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
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
              > 취소</button>
              <button
                type="submit"
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
              > 다음</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}